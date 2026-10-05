export interface VocabularyItem {
  id: string
  word: string
  meaning: string
}

export interface VocabularySet {
  id: string
  name: string
  words: VocabularyItem[]
}
