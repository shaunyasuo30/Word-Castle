// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { dictionaryAudio } from './dictionaryAudio'

beforeEach(() => dictionaryAudio.clearCache())
afterEach(() => { dictionaryAudio.clearCache(); vi.unstubAllGlobals() })

it('selects a real Wiktionary recording by accent and caches the media list', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ items: [
    { title: 'File:En-us-apple.ogg', type: 'audio' },
    { title: 'File:En-uk-apple.ogg', type: 'audio' },
    { title: 'File:Red_Apple.jpg', type: 'image' },
  ] }) }))
  vi.stubGlobal('fetch', fetcher)
  const uk = await dictionaryAudio.get('Apple', 'en-GB')
  const us = await dictionaryAudio.get('apple', 'en-US')
  expect(uk?.audioURL).toContain('Special:Redirect/file/En-uk-apple.ogg')
  expect(uk?.pageURL).toContain('File:En-uk-apple.ogg')
  expect(us?.fileName).toBe('En-us-apple.ogg')
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('skips phrase recordings and returns no match for an unavailable accent', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [
    { title: 'File:En-uk-a_cat.ogg', type: 'audio' },
    { title: 'File:En-us-cat.ogg', type: 'audio' },
  ] }) })))
  expect(await dictionaryAudio.get('cat', 'en-GB')).toBeNull()
  expect((await dictionaryAudio.get('cat', 'en-US'))?.fileName).toBe('En-us-cat.ogg')
})
