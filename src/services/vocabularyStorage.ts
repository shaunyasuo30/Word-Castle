import type { VocabularySet } from '../types/vocabulary'
import { basicSet, initialSets, topicSets } from '../data/sampleSets'

const STORAGE_KEY = 'word-castle:vocabulary:v1'
const SAMPLE_MIGRATION_KEY = 'word-castle:samples:v2'

export const demoSet = basicSet

function isSet(value: unknown): value is VocabularySet {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VocabularySet>
  return typeof item.id === 'string' && typeof item.name === 'string' &&
    Array.isArray(item.words) && item.words.every(word =>
      word && typeof word.id === 'string' && typeof word.word === 'string' &&
      /^[a-z]+$/i.test(word.word) && typeof word.meaning === 'string',
    )
}

export const vocabularyStorage = {
  load(): VocabularySet[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return initialSets
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return initialSets
      const saved = parsed.filter(isSet)
      if (localStorage.getItem(SAMPLE_MIGRATION_KEY) === '1') return saved
      const merged = [...saved, ...topicSets.filter(sample => !saved.some(set => set.id === sample.id))]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        localStorage.setItem(SAMPLE_MIGRATION_KEY, '1')
      } catch { /* Keep the merged sets for this session. */ }
      return merged
    } catch {
      return initialSets
    }
  },
  save(sets: VocabularySet[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets))
    try { localStorage.setItem(SAMPLE_MIGRATION_KEY, '1') }
    catch { /* Saved sets remain available even if the marker cannot be written. */ }
  },
}
