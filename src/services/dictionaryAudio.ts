import type { Accent } from './speechService'

export interface Recording {
  fileName: string
  audioURL: string
  pageURL: string
}

interface MediaItem { title?: string; type?: string }
interface MediaList { items?: MediaItem[] }
type Recordings = Partial<Record<Accent, Recording>>

const LOOKUP_TIMEOUT_MS = 3500
const cache = new Map<string, { result: Promise<Recordings>; expiresAt: number }>()

function matchRecording(title: string, word: string): { accent: Accent; recording: Recording } | null {
  const match = /^File:en-(uk|gb|us)-([a-z]+)\.(ogg|oga|mp3|wav)$/i.exec(title)
  if (!match || match[2].toLowerCase() !== word) return null
  const fileName = title.slice(5)
  const encoded = encodeURIComponent(fileName)
  return {
    accent: match[1].toLowerCase() === 'us' ? 'en-US' : 'en-GB',
    recording: {
      fileName,
      audioURL: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}`,
      pageURL: `https://commons.wikimedia.org/wiki/File:${encoded}`,
    },
  }
}

async function fetchRecordings(word: string): Promise<Recordings> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
  try {
    const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/media-list/${encodeURIComponent(word)}`, { signal: controller.signal })
    if (!response.ok) return {}
    const data: MediaList = await response.json()
    const recordings: Recordings = {}
    if (!Array.isArray(data.items)) return recordings
    for (const item of data.items) {
      if (item?.type !== 'audio' || typeof item.title !== 'string') continue
      const found = matchRecording(item.title, word)
      if (found) recordings[found.accent] ??= found.recording
    }
    return recordings
  } catch { return {} }
  finally { clearTimeout(timeout) }
}

function lookup(word: string): Promise<Recordings> {
  const key = word.trim().toLowerCase()
  if (!/^[a-z]+$/.test(key)) return Promise.resolve({})
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result
  const entry = { result: Promise.resolve({} as Recordings), expiresAt: Date.now() + LOOKUP_TIMEOUT_MS + 1000 }
  entry.result = fetchRecordings(key).then(recordings => {
    entry.expiresAt = Date.now() + (Object.keys(recordings).length ? 5 * 60_000 : 30_000)
    return recordings
  })
  cache.set(key, entry)
  return entry.result
}

export const dictionaryAudio = {
  async get(word: string, accent: Accent): Promise<Recording | null> {
    return (await lookup(word))[accent] ?? null
  },

  prefetch(words: string[]): void {
    const queue = [...new Set(words.map(word => word.toLowerCase()))]
    let cursor = 0
    const worker = async () => {
      while (cursor < queue.length) await lookup(queue[cursor++])
    }
    for (let i = 0; i < Math.min(3, queue.length); i++) void worker()
  },

  clearCache(): void { cache.clear() },
}
