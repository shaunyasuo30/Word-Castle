import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BookOpen, Plus, Search, Volume2, X } from 'lucide-react'
import { lookupTranslation, lookupWord, pronounceWord, type DictionaryEntry } from '../services/dictionaryService'
import { validateVocabularyEntry } from '../services/vocabularyTransfer'
import { MAX_WORDS_PER_SET } from '../data/sampleSets'
import type { VocabularySet } from '../types/vocabulary'

interface Props {
  sets: VocabularySet[]
  onChange: (sets: VocabularySet[]) => void
}

function shortDefinition(definition: string): string {
  if (definition.length <= 100) return definition
  const prefix = definition.slice(0, 100)
  return prefix.slice(0, prefix.lastIndexOf(' ')) || prefix
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'WORD_NOT_FOUND') return 'Không tìm thấy từ này trong từ điển.'
    if (error.message === 'NETWORK_ERROR') return 'Không thể kết nối tới từ điển. Hãy kiểm tra Internet và thử lại.'
    if (error.message === 'EMPTY_WORD') return 'Hãy nhập từ cần tra.'
  }
  return 'Từ điển tạm thời không khả dụng. Hãy thử lại sau.'
}

export default function DictionaryLookup({ sets, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [entry, setEntry] = useState<DictionaryEntry | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [searchedWord, setSearchedWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [newSetName, setNewSetName] = useState('')
  const [meaning, setMeaning] = useState('')
  const [addError, setAddError] = useState('')
  const [message, setMessage] = useState('')
  const requestId = useRef(0)
  const resultWord = entry?.word ?? searchedWord
  const hasResult = !!entry || !!translation

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [message])

  async function search(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const word = query.trim().toLowerCase()
    requestId.current++
    const current = requestId.current
    setEntry(null); setTranslation(null); setSearchedWord(word); setLookupError(''); setMessage(''); setModalOpen(false)
    if (!word) { setLoading(false); setDetailsLoading(false); setLookupError('Hãy nhập từ cần tra.'); return }
    setLoading(true)
    setDetailsLoading(true)
    let translated: string | null = null
    let dictionary: DictionaryEntry | null = null
    let translationFailure: unknown
    let dictionaryFailure: unknown
    await Promise.all([
      lookupTranslation(word).then(result => { translated = result; if (current === requestId.current) { setTranslation(result); setLoading(false) } }).catch(error => { translationFailure = error }),
      lookupWord(word).then(result => { dictionary = result; if (current === requestId.current) { setEntry(result); setLoading(false) } }).catch(error => { dictionaryFailure = error }).finally(() => { if (current === requestId.current) setDetailsLoading(false) }),
    ])
    if (current !== requestId.current) return
    if (!translated && !dictionary) setLookupError(errorMessage(dictionaryFailure ?? translationFailure))
    setLoading(false)
  }

  function openAdd(): void {
    if (!hasResult || loading) return
    setTargetId(sets[0]?.id ?? 'new')
    setNewSetName('')
    setMeaning(shortDefinition(translation ?? entry?.meanings[0]?.definitions[0]?.definition ?? ''))
    setAddError('')
    setModalOpen(true)
  }

  function addWord(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!hasResult) return
    const word = validateVocabularyEntry(resultWord, meaning)
    if (!word) {
      setAddError('Game chỉ nhận từ A–Z dài tối đa 14 ký tự và nghĩa dài tối đa 100 ký tự.')
      return
    }
    let target: VocabularySet | undefined
    if (targetId === 'new') {
      const name = newSetName.trim()
      if (!name || name.length > 50) { setAddError('Tên bộ từ phải có từ 1 đến 50 ký tự.'); return }
      if (sets.some(set => set.name.toLocaleLowerCase('vi-VN') === name.toLocaleLowerCase('vi-VN'))) {
        setAddError('Tên bộ từ này đã tồn tại.'); return
      }
      target = { id: crypto.randomUUID(), name, words: [] }
    } else target = sets.find(set => set.id === targetId)
    if (!target) { setAddError('Hãy chọn một bộ từ.'); return }
    if (target.words.some(item => item.word.toLowerCase() === word.word)) {
      setAddError(`“${word.word}” đã có trong ${target.name}.`); return
    }
    if (target.words.length >= MAX_WORDS_PER_SET) {
      setAddError(`Bộ từ đã đủ ${MAX_WORDS_PER_SET} từ. Hãy chọn bộ khác.`); return
    }
    const updated = { ...target, words: [...target.words, { id: crypto.randomUUID(), ...word, ...(entry ? { dictionary: entry } : {}) }] }
    onChange(targetId === 'new' ? [...sets, updated] : sets.map(set => set.id === target.id ? updated : set))
    setModalOpen(false)
    setMessage(`Đã thêm “${word.word}” vào ${target.name}.`)
  }

  return <section className="dictionary-panel panel" aria-labelledby="dictionary-title">
    <div className="dictionary-heading"><div><span className="eyebrow">TRA CỨU TRỰC TUYẾN</span><h2 id="dictionary-title"><BookOpen size={24} /> Dictionary</h2><p>Tra nghĩa tiếng Việt, xem định nghĩa và thêm từ vào bộ đang học.</p></div></div>
    <form className="dictionary-search" onSubmit={event => void search(event)}>
      <input aria-label="Từ cần tra" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập từ tiếng Anh: (chú ý: từ diển hiện tại chỉ tra được nghĩa đen)" autoComplete="off" />
      <button className="button button-primary" type="submit" disabled={loading}><Search size={18} /> {loading ? 'Đang tra...' : 'Tra từ'}</button>
    </form>
    {lookupError && <p className="dictionary-error" role="alert">{lookupError}</p>}
    {message && <p className="dictionary-success" role="status">{message}</p>}
    {hasResult && <article className="dictionary-result">
      <div className="dictionary-result-heading"><div><h3>{resultWord}</h3>{entry?.phonetic && <span className="dictionary-phonetic">{entry.phonetic}</span>}</div><button type="button" className="dictionary-pronounce" onClick={() => pronounceWord(entry ?? { word: resultWord, phonetics: [] })} aria-label={`Phát âm ${resultWord}`}><Volume2 size={20} /> Pronunciation</button></div>
      {translation && <div className="dictionary-translation"><small>NGHĨA TIẾNG VIỆT</small><strong>{translation}</strong></div>}
      {!translation && !loading && <p className="dictionary-related">Chưa lấy được nghĩa tiếng Việt; có thể sửa nghĩa khi thêm từ.</p>}
      {entry?.meanings.map((item, meaningIndex) => <div className="dictionary-meaning" key={`${item.partOfSpeech}-${meaningIndex}`}>
        <h4>{item.partOfSpeech}</h4>
        <ol>{item.definitions.map((definition, index) => <li key={`${meaningIndex}-${index}`}><p>{definition.definition}</p>{definition.example && <p className="dictionary-example">Example: {definition.example}</p>}{definition.synonyms.length > 0 && <p className="dictionary-related"><strong>Synonyms:</strong> {definition.synonyms.join(', ')}</p>}{definition.antonyms.length > 0 && <p className="dictionary-related"><strong>Antonyms:</strong> {definition.antonyms.join(', ')}</p>}</li>)}</ol>
        {item.synonyms.length > 0 && <p className="dictionary-related"><strong>Synonyms:</strong> {item.synonyms.join(', ')}</p>}
        {item.antonyms.length > 0 && <p className="dictionary-related"><strong>Antonyms:</strong> {item.antonyms.join(', ')}</p>}
      </div>)}
      {detailsLoading && !entry && <p className="dictionary-related">Đang bổ sung dữ liệu từ điển...</p>}
      <button type="button" className="button button-teal dictionary-add" onClick={openAdd} disabled={loading}><Plus size={18} /> Add to vocabulary</button>
    </article>}
    {modalOpen && hasResult && <div className="dictionary-modal-backdrop" onClick={() => setModalOpen(false)}>
      <div className="dictionary-modal" role="dialog" aria-modal="true" aria-labelledby="dictionary-add-title" onClick={event => event.stopPropagation()}>
        <div className="dictionary-modal-heading"><h3 id="dictionary-add-title">Add “{resultWord}” to:</h3><button type="button" aria-label="Đóng" onClick={() => setModalOpen(false)}><X size={20} /></button></div>
        <form onSubmit={addWord}>
          <div className="dictionary-set-list">{sets.map(set => <label key={set.id}><input type="radio" name="dictionary-target" value={set.id} checked={targetId === set.id} onChange={() => { setTargetId(set.id); setAddError('') }} /><span>{set.name} <small>{set.words.length}/{MAX_WORDS_PER_SET}</small></span></label>)}</div>
          <label className="dictionary-new-set"><input type="radio" name="dictionary-target" value="new" checked={targetId === 'new'} onChange={() => { setTargetId('new'); setAddError('') }} /> + Create new vocabulary set</label>
          {targetId === 'new' && <input className="dictionary-text-input" aria-label="Tên bộ từ mới" value={newSetName} onChange={event => setNewSetName(event.target.value)} placeholder="Tên bộ từ mới" maxLength={50} />}
          <label className="dictionary-meaning-input">Nghĩa hiển thị trong game<input className="dictionary-text-input" value={meaning} onChange={event => setMeaning(event.target.value)} maxLength={100} /><small>Nghĩa dịch tự động có thể chưa sát ngữ cảnh; bạn có thể sửa trước khi lưu.</small></label>
          {addError && <p className="dictionary-error" role="alert">{addError}</p>}
          <div className="dictionary-modal-actions"><button type="button" className="button button-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="button button-teal">Add</button></div>
        </form>
      </div>
    </div>}
  </section>
}
