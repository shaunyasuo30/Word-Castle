import { afterEach, expect, it, vi } from 'vitest'
import { GET } from '../../api/translate'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('normalizes the query and forwards it to the Vietnamese translation endpoint', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([[['xinh đẹp', 'beautiful']]]), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  expect((await GET(new Request('https://example.com/api/translate'))).status).toBe(400)
  const result = await GET(new Request('https://example.com/api/translate?word=%20BEAUTIFUL%20'))
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual([[['xinh đẹp', 'beautiful']]])
  expect(fetchMock).toHaveBeenCalledWith('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=beautiful', { signal: expect.any(AbortSignal) })
})

it('uses MyMemory when Google limits requests', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'xinh đẹp' } }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  const result = await GET(new Request('https://example.com/api/translate?word=beautiful'))
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual([[['xinh đẹp', 'beautiful']]])
  expect(fetchMock.mock.calls[1][0]).toBe('https://api.mymemory.translated.net/get?q=beautiful&langpair=en%7Cvi')
})

it('reports failure when both sources are unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 })).mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(new TypeError('offline')).mockRejectedValueOnce(new TypeError('offline')))
  expect((await GET(new Request('https://example.com/api/translate?word=hello'))).status).toBe(502)
  expect((await GET(new Request('https://example.com/api/translate?word=hello'))).status).toBe(502)
})
