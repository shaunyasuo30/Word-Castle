import type { VocabularyItem, VocabularySet } from '../types/vocabulary'
import { MAX_WORDS_PER_SET } from '../data/sampleSets'
import { parseDictionaryResponse } from './dictionaryService'

export interface ImportSummary {
  imported: number
  skipped: number
  invalid: number
  messages: string[]
}

export function validateVocabularyEntry(word: string, meaning: string): { word: string; meaning: string } | null {
  const normalized = word.trim().toLowerCase()
  const translated = meaning.trim()
  if (!/^[a-z]{1,14}$/.test(normalized) || !translated || translated.length > 100) return null
  return { word: normalized, meaning: translated }
}

function parseCsvLine(line: string): string[] | null {
  const fields: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++ }
      else if (quoted) quoted = false
      else if (!field) quoted = true
      else return null
    } else if (char === ',' && !quoted) { fields.push(field); field = '' }
    else field += char
  }
  if (quoted) return null
  fields.push(field)
  return fields
}

export function importCsvIntoSet(text: string, set: VocabularySet): { set: VocabularySet; summary: ImportSummary } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const summary: ImportSummary = { imported: 0, skipped: 0, invalid: 0, messages: [] }
  const words = [...set.words]
  const seen = new Set(words.map(item => item.word.toLowerCase()))
  let first = true
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const fields = parseCsvLine(lines[i])
    if (first) {
      first = false
      if (fields?.length === 2 && fields[0].trim().toLowerCase() === 'word' && fields[1].trim().toLowerCase() === 'meaning') continue
    }
    const entry = fields?.length === 2 ? validateVocabularyEntry(fields[0], fields[1]) : null
    if (!entry) {
      summary.invalid++
      if (summary.messages.length < 8) summary.messages.push(`Dòng ${i + 1}: từ hoặc nghĩa không hợp lệ.`)
      continue
    }
    if (seen.has(entry.word) || words.length >= MAX_WORDS_PER_SET) {
      summary.skipped++
      if (summary.messages.length < 8) summary.messages.push(`Dòng ${i + 1}: trùng từ hoặc bộ đã đầy.`)
      continue
    }
    words.push({ id: crypto.randomUUID(), ...entry })
    seen.add(entry.word)
    summary.imported++
  }
  return { set: { ...set, words }, summary }
}

export function exportSetJson(set: VocabularySet): string {
  return JSON.stringify({ version: 1, set }, null, 2)
}

export function importSetJson(text: string): { set: VocabularySet; summary: ImportSummary } {
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('Tệp JSON không đúng định dạng bộ từ.')
  const payload = parsed as { version?: unknown; set?: unknown }
  if (payload.version !== 1 || !payload.set || typeof payload.set !== 'object') {
    throw new Error('Tệp JSON không đúng phiên bản hoặc cấu trúc bộ từ.')
  }
  const source = payload.set as { name?: unknown; words?: unknown }
  if (typeof source.name !== 'string' || !source.name.trim() || source.name.trim().length > 50 || !Array.isArray(source.words)) {
    throw new Error('Tên bộ từ hoặc danh sách từ không hợp lệ.')
  }
  const summary: ImportSummary = { imported: 0, skipped: 0, invalid: 0, messages: [] }
  const seen = new Set<string>()
  const words: VocabularyItem[] = []
  for (const [index, raw] of source.words.entries()) {
    const item = raw && typeof raw === 'object' ? raw as { word?: unknown; meaning?: unknown; dictionary?: unknown } : {}
    const entry = typeof item.word === 'string' && typeof item.meaning === 'string'
      ? validateVocabularyEntry(item.word, item.meaning) : null
    if (!entry) {
      summary.invalid++
      if (summary.messages.length < 8) summary.messages.push(`Mục ${index + 1}: từ hoặc nghĩa không hợp lệ.`)
    } else if (seen.has(entry.word) || words.length >= MAX_WORDS_PER_SET) {
      summary.skipped++
      if (summary.messages.length < 8) summary.messages.push(`Mục ${index + 1}: trùng từ hoặc bộ đã đầy.`)
    } else {
      let dictionary
      if (item.dictionary) {
        try { dictionary = parseDictionaryResponse([item.dictionary]) }
        catch { /* Keep a valid game word even if optional metadata is invalid. */ }
      }
      words.push({ id: crypto.randomUUID(), ...entry, ...(dictionary ? { dictionary } : {}) })
      seen.add(entry.word)
      summary.imported++
    }
  }
  return { set: { id: crypto.randomUUID(), name: source.name.trim(), words }, summary }
}
