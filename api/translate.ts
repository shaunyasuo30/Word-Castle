const UPSTREAM = 'https://translate.googleapis.com/translate_a/single'
const FALLBACK = 'https://api.mymemory.translated.net/get'

function translatedText(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = (value as { responseData?: { translatedText?: unknown }; responseStatus?: unknown })
  return data.responseStatus === 200 && typeof data.responseData?.translatedText === 'string'
    ? data.responseData.translatedText.trim() || undefined : undefined
}

export async function GET(request: Request): Promise<Response> {
  const word = new URL(request.url).searchParams.get('word')?.trim().toLowerCase() ?? ''
  if (!word || word.length > 60) return Response.json({ error: 'INVALID_WORD' }, { status: 400 })

  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'vi', dt: 't', q: word })
  try {
    const upstream = await fetch(`${UPSTREAM}?${params}`, { signal: AbortSignal.timeout(3_000) })
    if (upstream.ok) return Response.json(await upstream.json(), { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch { /* Try the fallback translation source. */ }

  try {
    const fallbackParams = new URLSearchParams({ q: word, langpair: 'en|vi' })
    const fallback = await fetch(`${FALLBACK}?${fallbackParams}`, { signal: AbortSignal.timeout(8_000) })
    if (!fallback.ok) throw new Error('TRANSLATION_UNAVAILABLE')
    const translation = translatedText(await fallback.json())
    if (!translation || translation.toLowerCase() === word) throw new Error('TRANSLATION_UNAVAILABLE')
    return Response.json([[[translation, word]]], { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch { return Response.json({ error: 'TRANSLATION_UNAVAILABLE' }, { status: 502 }) }
}
