import type { DictionaryEntry } from '../services/dictionaryService'

export interface VocabularyItem {
  id: string
  word: string
  meaning: string
  dictionary?: DictionaryEntry
}

export interface VocabularySet {
  id: string
  name: string
  words: VocabularyItem[]
}
