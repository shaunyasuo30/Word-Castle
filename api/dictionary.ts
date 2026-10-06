const UPSTREAM = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

export async function GET(request: Request): Promise<Response> {
  const word = new URL(request.url).searchParams.get('word')?.trim().toLowerCase() ?? ''
  if (!word || word.length > 60) return Response.json({ error: 'INVALID_WORD' }, { status: 400 })

  try {
    const upstream = await fetch(`${UPSTREAM}${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (upstream.status === 404) return Response.json({ error: 'WORD_NOT_FOUND' }, { status: 404 })
    if (!upstream.ok) return Response.json({ error: 'DICTIONARY_UNAVAILABLE' }, { status: 502 })
    return Response.json(await upstream.json(), {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return Response.json({ error: 'DICTIONARY_UNAVAILABLE' }, { status: 502 })
  }
}
