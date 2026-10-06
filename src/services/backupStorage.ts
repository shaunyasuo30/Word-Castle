import type { VocabularySet } from '../types/vocabulary'
import { isSet, vocabularyStorage } from './vocabularyStorage'
import { HISTORY_KEY, gameHistoryStorage, isGameHistoryEntry, isHistorySummary, summarizeGames, type GameHistoryEntry, type HistorySummary } from './gameHistoryStorage'
import { STATS_KEY, isLearningStats, learningStatsStorage, type LearningStats } from './learningStatsStorage'

const VOCABULARY_KEY = 'word-castle:vocabulary:v1'
const SAMPLE_MARKER_KEY = 'word-castle:samples:v2'
const SETTING_KEYS = {
  theme: 'word-castle:theme:v1',
  fallSpeed: 'word-castle:fall-speed',
  volume: 'word-castle:volume:v1',
  sfxMuted: 'word-castle:sfx-muted',
  accent: 'word-castle:accent:v1',
  voice: 'word-castle:voice:v1',
  difficulty: 'word-castle:difficulty:v1',
} as const

interface BackupSettings {
  theme: 'day' | 'night'
  fallSpeed: number | null
  volume: number
  sfxMuted: boolean
  accent: 'en-US' | 'en-GB'
  voice: string
  difficulty: 'easy' | 'normal' | 'hard' | 'custom' | null
}

interface Backup {
  version: 1
  exportedAt: string
  vocabulary: VocabularySet[]
  stats: LearningStats
  history: GameHistoryEntry[]
  historySummary?: HistorySummary
  settings: BackupSettings
}

function settingsSnapshot(): BackupSettings {
  const rawSpeed = localStorage.getItem(SETTING_KEYS.fallSpeed)
  const speed = rawSpeed === null ? null : Number(rawSpeed)
  const savedVolume = localStorage.getItem(SETTING_KEYS.volume)
  const rawVolume = savedVolume === null ? 100 : Number(savedVolume)
  const difficulty = localStorage.getItem(SETTING_KEYS.difficulty)
  return {
    theme: localStorage.getItem(SETTING_KEYS.theme) === 'day' ? 'day' : 'night',
    fallSpeed: speed !== null && Number.isFinite(speed) && speed >= 8 && speed <= 48 ? speed : null,
    volume: Number.isFinite(rawVolume) && rawVolume >= 0 && rawVolume <= 100 ? rawVolume : 100,
    sfxMuted: localStorage.getItem(SETTING_KEYS.sfxMuted) === 'true',
    accent: localStorage.getItem(SETTING_KEYS.accent) === 'en-GB' ? 'en-GB' : 'en-US',
    voice: localStorage.getItem(SETTING_KEYS.voice) ?? '',
    difficulty: difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard' || difficulty === 'custom' ? difficulty : null,
  }
}

function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Backup>
  const settings = item.settings as Partial<BackupSettings> | undefined
  return item.version === 1 && typeof item.exportedAt === 'string' &&
    Array.isArray(item.vocabulary) && item.vocabulary.every(isSet) &&
    isLearningStats(item.stats) && Array.isArray(item.history) && item.history.every(isGameHistoryEntry) &&
    (item.historySummary === undefined || isHistorySummary(item.historySummary)) &&
    !!settings && (settings.theme === 'day' || settings.theme === 'night') &&
    (settings.fallSpeed === null || typeof settings.fallSpeed === 'number' && Number.isFinite(settings.fallSpeed) && settings.fallSpeed >= 8 && settings.fallSpeed <= 48) &&
    typeof settings.volume === 'number' && Number.isFinite(settings.volume) && settings.volume >= 0 && settings.volume <= 100 &&
    typeof settings.sfxMuted === 'boolean' && (settings.accent === 'en-US' || settings.accent === 'en-GB') &&
    typeof settings.voice === 'string' &&
    (settings.difficulty === null || settings.difficulty === 'easy' || settings.difficulty === 'normal' || settings.difficulty === 'hard' || settings.difficulty === 'custom')
}

export const backupStorage = {
  export(): string {
    const backup: Backup = {
      version: 1, exportedAt: new Date().toISOString(),
      vocabulary: vocabularyStorage.load(), stats: learningStatsStorage.load(),
      history: gameHistoryStorage.load(), historySummary: gameHistoryStorage.getSummary(), settings: settingsSnapshot(),
    }
    return JSON.stringify(backup, null, 2)
  },

  restore(text: string): VocabularySet[] {
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { throw new Error('Tệp sao lưu không phải JSON hợp lệ.') }
    if (!isBackup(parsed)) throw new Error('Tệp sao lưu không đúng phiên bản hoặc chứa dữ liệu không hợp lệ.')
    const backup = parsed
    const writes: Record<string, string | null> = {
      [VOCABULARY_KEY]: JSON.stringify(backup.vocabulary),
      [SAMPLE_MARKER_KEY]: '1',
      [STATS_KEY]: JSON.stringify({ version: 1, words: backup.stats }),
      [HISTORY_KEY]: JSON.stringify({ version: 1, games: backup.history.slice(0, 50),
        summary: backup.historySummary ?? summarizeGames(backup.history) }),
      [SETTING_KEYS.theme]: backup.settings.theme,
      [SETTING_KEYS.fallSpeed]: backup.settings.fallSpeed === null ? null : String(backup.settings.fallSpeed),
      [SETTING_KEYS.volume]: String(backup.settings.volume),
      [SETTING_KEYS.sfxMuted]: String(backup.settings.sfxMuted),
      [SETTING_KEYS.accent]: backup.settings.accent,
      [SETTING_KEYS.voice]: backup.settings.voice,
      [SETTING_KEYS.difficulty]: backup.settings.difficulty,
    }
    const previous = Object.fromEntries(Object.keys(writes).map(key => [key, localStorage.getItem(key)]))
    try {
      for (const [key, value] of Object.entries(writes)) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    } catch {
      for (const [key, value] of Object.entries(previous)) {
        try {
          if (value === null) localStorage.removeItem(key)
          else localStorage.setItem(key, value)
        } catch { /* Storage may remain unavailable. */ }
      }
      throw new Error('Không thể ghi bản sao lưu vào trình duyệt.')
    }
    return backup.vocabulary
  },
}
