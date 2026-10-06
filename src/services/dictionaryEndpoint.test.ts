import { afterEach, expect, it, vi } from 'vitest'
import { GET } from '../../api/dictionary'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('validates the query and forwards a normalized word to Free Dictionary API', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ word: 'beautiful' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  expect((await GET(new Request('https://example.com/api/dictionary'))).status).toBe(400)
  const response = await GET(new Request('https://example.com/api/dictionary?word=%20BEAUTIFUL%20'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual([{ word: 'beautiful' }])
  expect(fetchMock).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/beautiful', { signal: expect.any(AbortSignal) })
})

it('preserves not-found status and reports upstream failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 404 })).mockRejectedValueOnce(new TypeError('offline')))
  expect((await GET(new Request('https://example.com/api/dictionary?word=unknown'))).status).toBe(404)
  expect((await GET(new Request('https://example.com/api/dictionary?word=hello'))).status).toBe(502)
})
