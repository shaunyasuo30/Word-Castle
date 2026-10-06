export interface DictionaryDefinition {
  definition: string
  example?: string
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryMeaning {
  partOfSpeech: string
  definitions: DictionaryDefinition[]
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryEntry {
  word: string
  phonetic?: string
  phonetics: { text?: string; audio?: string }[]
  meanings: DictionaryMeaning[]
}

const cache = new Map<string, Promise<DictionaryEntry>>()
const translationCache = new Map<string, Promise<string>>()
const DIRECT_TIMEOUT_MS = 3_500
const DICTIONARY_TIMEOUT_MS = 5_000
const FALLBACK_TIMEOUT_MS = 8_000

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const optionalText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(optionalText).filter((text): text is string => !!text) : []

function audioUrl(value: unknown): string | undefined {
  const raw = optionalText(value)
  if (!raw) return undefined
  try {
    const url = new URL(raw, 'https://api.dictionaryapi.dev')
    return url.protocol === 'https:' ? url.href : undefined
  } catch { return undefined }
}

export function parseDictionaryResponse(value: unknown): DictionaryEntry {
  if (!Array.isArray(value) || value.length === 0) throw new Error('INVALID_RESPONSE')
  const entries = value.map(object)
  const word = entries.map(entry => optionalText(entry.word)).find(Boolean)
  if (!word) throw new Error('INVALID_RESPONSE')
  const phonetics = entries.flatMap(entry => Array.isArray(entry.phonetics) ? entry.phonetics : []).map(raw => {
    const item = object(raw)
    return { text: optionalText(item.text), audio: audioUrl(item.audio) }
  }).filter(item => item.text || item.audio)
  const meanings = entries.flatMap(entry => Array.isArray(entry.meanings) ? entry.meanings : []).map(raw => {
    const item = object(raw)
    const definitions = (Array.isArray(item.definitions) ? item.definitions : []).map(rawDefinition => {
      const definition = object(rawDefinition)
      return {
        definition: optionalText(definition.definition) ?? '',
        example: optionalText(definition.example),
        synonyms: textList(definition.synonyms),
        antonyms: textList(definition.antonyms),
      }
    }).filter(item => item.definition)
    return {
      partOfSpeech: optionalText(item.partOfSpeech) ?? 'Other',
      definitions,
      synonyms: textList(item.synonyms),
      antonyms: textList(item.antonyms),
    }
  }).filter(item => item.definitions.length)
  if (!meanings.length) throw new Error('INVALID_RESPONSE')
  return {
    word: word.toLowerCase(),
    phonetic: entries.map(entry => optionalText(entry.phonetic)).find(Boolean)
      ?? phonetics.map(item => item.text).find(Boolean),
    phonetics,
    meanings,
  }
}

export function lookupWord(word: string): Promise<DictionaryEntry> {
  const normalizedWord = word.trim().toLowerCase()
  if (!normalizedWord) return Promise.reject(new Error('EMPTY_WORD'))
  const cached = cache.get(normalizedWord)
  if (cached) return cached
  const request = (async () => {
    const directUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`
    const sameOriginUrl = `/api/dictionary?word=${encodeURIComponent(normalizedWord)}`
    try { return await fetchDictionary(sameOriginUrl, DICTIONARY_TIMEOUT_MS) }
    catch (error) {
      if (error instanceof Error && error.message === 'WORD_NOT_FOUND') throw error
      return fetchDictionary(directUrl, DIRECT_TIMEOUT_MS)
    }
  })()
  cache.set(normalizedWord, request)
  void request.catch(() => { if (cache.get(normalizedWord) === request) cache.delete(normalizedWord) })
  return request
}

async function fetchDictionary(url: string, timeout: number): Promise<DictionaryEntry> {
  const response = await fetchWithTimeout(url, timeout)
  if (response.status === 404) throw new Error('WORD_NOT_FOUND')
  if (!response.ok) throw new Error('DICTIONARY_UNAVAILABLE')
  try { return parseDictionaryResponse(await response.json()) }
  catch { throw new Error('INVALID_RESPONSE') }
}

export function parseTranslationResponse(value: unknown): string {
  if (!Array.isArray(value) || !Array.isArray(value[0])) throw new Error('INVALID_RESPONSE')
  const translated = value[0]
    .filter((item: unknown) => Array.isArray(item) && typeof item[0] === 'string')
    .map((item: string[]) => item[0]).join('').trim()
  if (!translated) throw new Error('INVALID_RESPONSE')
  return translated
}

export function lookupTranslation(word: string): Promise<string> {
  const normalizedWord = word.trim().toLowerCase()
  if (!normalizedWord) return Promise.reject(new Error('EMPTY_WORD'))
  const cached = translationCache.get(normalizedWord)
  if (cached) return cached
  const request = (async () => {
    const response = await fetchWithTimeout(`/api/translate?word=${encodeURIComponent(normalizedWord)}`, FALLBACK_TIMEOUT_MS)
    if (!response.ok) throw new Error('TRANSLATION_UNAVAILABLE')
    try { return parseTranslationResponse(await response.json()) }
    catch { throw new Error('INVALID_RESPONSE') }
  })()
  translationCache.set(normalizedWord, request)
  void request.catch(() => { if (translationCache.get(normalizedWord) === request) translationCache.delete(normalizedWord) })
  return request
}

async function fetchWithTimeout(url: string, delay: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), delay)
  try { return await fetch(url, { signal: controller.signal }) }
  catch { throw new Error('NETWORK_ERROR') }
  finally { clearTimeout(timeout) }
}

export function pronounceWord(entry: Pick<DictionaryEntry, 'word' | 'phonetics'>): void {
  const audio = entry.phonetics.find(item => item.audio)?.audio
  if (audio) {
    const player = new Audio(audio)
    void player.play().catch(() => speak(entry.word))
  } else speak(entry.word)
}

function speak(word: string): void {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  speechSynthesis.speak(utterance)
}

export const clearDictionaryCache = (): void => { cache.clear(); translationCache.clear() }
