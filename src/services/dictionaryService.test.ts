import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearDictionaryCache, lookupTranslation, lookupWord, parseDictionaryResponse, parseTranslationResponse, pronounceWord } from './dictionaryService'

beforeEach(() => clearDictionaryCache())
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

it('normalizes requests, caches them for the session and parses multiple meanings and audio variants', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response([
    { word: 'Beautiful', phonetics: [{ text: '/first/' }, { audio: '//example.com/second.mp3' }, { audio: 'https://example.com/third.mp3' }], meanings: [
      { partOfSpeech: 'adjective', definitions: [{ definition: 'Pleasing to see.', example: 'A beautiful view.', synonyms: ['pretty'] }], antonyms: ['ugly'] },
      { partOfSpeech: 'noun', definitions: [{ definition: 'A beautiful person.' }] },
    ] },
  ]))
  vi.stubGlobal('fetch', fetchMock)
  const first = await lookupWord('  BEAUTIFUL  ')
  expect(fetchMock).toHaveBeenCalledWith('/api/dictionary?word=beautiful', { signal: expect.any(AbortSignal) })
  expect(await lookupWord('beautiful')).toBe(first)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(first.phonetic).toBe('/first/')
  expect(first.phonetics.map(item => item.audio).filter(Boolean)).toEqual(['https://example.com/second.mp3', 'https://example.com/third.mp3'])
  expect(first.meanings).toHaveLength(2)
  expect(first.meanings[0].definitions[0]).toMatchObject({ example: 'A beautiful view.', synonyms: ['pretty'], antonyms: [] })
  expect(first.meanings[0].antonyms).toEqual(['ugly'])
})

it('handles missing optional fields and rejects empty or missing words', async () => {
  expect(parseDictionaryResponse([{ word: 'plain', meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'Simple.' }] }] }])).toEqual({
    word: 'plain', phonetic: undefined, phonetics: [], meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'Simple.', example: undefined, synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }],
  })
  const fetchMock = vi.fn().mockResolvedValueOnce(response({}, 404))
  vi.stubGlobal('fetch', fetchMock)
  await expect(lookupWord('   ')).rejects.toThrow('EMPTY_WORD')
  expect(fetchMock).not.toHaveBeenCalled()
  await expect(lookupWord('again')).rejects.toThrow('WORD_NOT_FOUND')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('falls back to the direct API when the same-origin endpoint is unavailable', async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new TypeError('blocked cross-origin request'))
    .mockResolvedValueOnce(response([{ word: 'again', meanings: [{ definitions: [{ definition: 'Once more.' }] }] }]))
  vi.stubGlobal('fetch', fetchMock)
  expect((await lookupWord('  AGAIN ')).meanings[0].definitions[0].definition).toBe('Once more.')
  expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
    '/api/dictionary?word=again',
    'https://api.dictionaryapi.dev/api/v2/entries/en/again',
  ])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('does not wait for a blocked direct request before reading the same-origin result', async () => {
  const fetchMock = vi.fn((url: string) => url.startsWith('/api/dictionary')
    ? Promise.resolve(response([{ word: 'quick', meanings: [{ definitions: [{ definition: 'Fast.' }] }] }]))
    : new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  const result = await Promise.race([
    lookupWord('quick'),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LOOKUP_TOO_SLOW')), 500)),
  ])
  expect(result.word).toBe('quick')
  expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/api/dictionary?word=quick'])
})

it('reports a network error when both routes fail and allows retry', async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(response([{ word: 'again', meanings: [{ definitions: [{ definition: 'Once more.' }] }] }]))
  vi.stubGlobal('fetch', fetchMock)
  await expect(lookupWord('again')).rejects.toThrow('NETWORK_ERROR')
  expect((await lookupWord('again')).word).toBe('again')
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it('uses the first available API audio and falls back to speech when absent', async () => {
  const play = vi.fn().mockResolvedValue(undefined)
  const AudioMock = vi.fn(function AudioMock() { return { play } })
  const speak = vi.fn()
  const cancel = vi.fn()
  const Utterance = vi.fn().mockImplementation(function (this: { text: string; lang?: string }, word: string) { this.text = word })
  vi.stubGlobal('Audio', AudioMock)
  vi.stubGlobal('speechSynthesis', { speak, cancel })
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  const entry = parseDictionaryResponse([{ word: 'hello', phonetics: [{ text: '/hello/' }, { audio: 'https://example.com/hello.mp3' }], meanings: [{ definitions: [{ definition: 'A greeting.' }] }] }])
  pronounceWord(entry)
  expect(AudioMock).toHaveBeenCalledWith('https://example.com/hello.mp3')
  expect(play).toHaveBeenCalledTimes(1)
  expect(speak).not.toHaveBeenCalled()
  pronounceWord({ ...entry, phonetics: [] })
  expect(speak).toHaveBeenCalledTimes(1)
  expect(speak.mock.calls[0][0].lang).toBe('en-US')
})

it('parses Vietnamese translation, normalizes lookup and caches it', async () => {
  expect(parseTranslationResponse([[['xinh ', 'beautiful'], ['đẹp', 'pretty']]])).toBe('xinh đẹp')
  expect(() => parseTranslationResponse({})).toThrow('INVALID_RESPONSE')
  const fetchMock = vi.fn().mockResolvedValue(response([[['xinh đẹp', 'beautiful']], null, 'en']))
  vi.stubGlobal('fetch', fetchMock)
  expect(await lookupTranslation(' BEAUTIFUL ')).toBe('xinh đẹp')
  expect(await lookupTranslation('beautiful')).toBe('xinh đẹp')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('/api/translate?word=beautiful', { signal: expect.any(AbortSignal) })
  await expect(lookupTranslation('  ')).rejects.toThrow('EMPTY_WORD')
})

it('retries translation after a failed request', async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response([[['đẹp', 'beautiful']]]))
  vi.stubGlobal('fetch', fetchMock)
  await expect(lookupTranslation('beautiful')).rejects.toThrow('NETWORK_ERROR')
  expect(await lookupTranslation('beautiful')).toBe('đẹp')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
