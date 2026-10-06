import BrandMark from './BrandMark'
import { useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, BookOpen, Check, Edit3, Play, Plus, Save, Trash2, X } from 'lucide-react'
import type { VocabularyItem, VocabularySet } from '../types/vocabulary'
import { MAX_WORDS_PER_SET } from '../data/sampleSets'
import { exportSetJson, importCsvIntoSet, importSetJson, validateVocabularyEntry, type ImportSummary } from '../services/vocabularyTransfer'
import { backupStorage } from '../services/backupStorage'

interface Props {
  sets: VocabularySet[]
  onChange: (sets: VocabularySet[]) => void
  onBack: () => void
  onPlay: (id: string) => void
  onRestore?: (sets: VocabularySet[]) => void
}

const WORDS_PER_PAGE = 50

export default function VocabularyPage({ sets, onChange, onBack, onPlay, onRestore }: Props) {
  const [selectedId, setSelectedId] = useState(sets[0]?.id ?? '')
  const [newSetName, setNewSetName] = useState('')
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [listPage, setListPage] = useState(0)
  const [transferMessage, setTransferMessage] = useState('')
  const csvInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const selected = sets.find(set => set.id === selectedId) ?? sets[0]
  const filteredWords = selected?.words.map((item, index) => ({ item, index })).filter(({ item }) =>
    `${item.word} ${item.meaning}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN'))) ?? []
  const pageCount = Math.max(1, Math.ceil(filteredWords.length / WORDS_PER_PAGE))
  const currentPage = Math.min(listPage, pageCount - 1)
  const pageWords = filteredWords.slice(currentPage * WORDS_PER_PAGE, (currentPage + 1) * WORDS_PER_PAGE)

  function updateSet(next: VocabularySet): void {
    onChange(sets.map(set => set.id === next.id ? next : set))
  }

  function createSet(): void {
    const name = newSetName.trim()
    if (!name) { setError('Hãy nhập tên bộ từ.'); return }
    const set = { id: crypto.randomUUID(), name, words: [] }
    onChange([...sets, set])
    setSelectedId(set.id)
    setQuery(''); setListPage(0)
    setNewSetName('')
    setError('')
  }

  function removeSet(id: string): void {
    if (!window.confirm('Xóa bộ từ này và toàn bộ từ bên trong?')) return
    const next = sets.filter(set => set.id !== id)
    onChange(next)
    setSelectedId(next[0]?.id ?? '')
    setQuery(''); setListPage(0)
    setEditingId(null)
  }

  function saveWord(): void {
    if (!selected) return
    if (!editingId && selected.words.length >= MAX_WORDS_PER_SET) {
      setError(`Mỗi bộ từ chứa tối đa ${MAX_WORDS_PER_SET} từ. Hãy xóa bớt từ hoặc tạo bộ mới.`); return
    }
    const normalized = word.trim().toLowerCase()
    const translated = meaning.trim()
    if (!/^[a-z]+$/.test(normalized)) { setError('Từ tiếng Anh chỉ gồm các chữ A–Z, không có khoảng trắng.'); return }
    if (!translated) { setError('Hãy nhập nghĩa tiếng Việt.'); return }
    const entry = validateVocabularyEntry(word, meaning)
    if (!entry) { setError('Từ hoặc nghĩa vượt quá độ dài cho phép.'); return }
    if (selected.words.some(item => item.word.toLowerCase() === normalized && item.id !== editingId)) {
      setError('Từ này đã có trong bộ từ.'); return
    }
    const words = editingId
      ? selected.words.map(item => item.id === editingId ? { ...item, ...entry } : item)
      : [...selected.words, { id: crypto.randomUUID(), ...entry }]
    updateSet({ ...selected, words })
    setWord(''); setMeaning(''); setEditingId(null); setError('')
  }

  function editWord(item: VocabularyItem): void {
    setEditingId(item.id); setWord(item.word); setMeaning(item.meaning); setError('')
  }

  function cancelEdit(): void {
    setEditingId(null); setWord(''); setMeaning(''); setError('')
  }

  function download(name: string, contents: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function describeImport(summary: ImportSummary): string {
    return `Imported: ${summary.imported} · Skipped: ${summary.skipped} · Invalid: ${summary.invalid}${summary.messages.length ? ` — ${summary.messages.join(' ')}` : ''}`
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, kind: 'csv' | 'json' | 'backup'): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const contents = await file.text()
      if (kind === 'csv') {
        if (!selected) throw new Error('Hãy tạo bộ từ trước khi nhập CSV.')
        const result = importCsvIntoSet(contents, selected)
        updateSet(result.set)
        setTransferMessage(describeImport(result.summary))
      } else if (kind === 'json') {
        const result = importSetJson(contents)
        onChange([...sets, result.set])
        setSelectedId(result.set.id)
        setTransferMessage(describeImport(result.summary))
      } else {
        if (!window.confirm('Khôi phục bản sao lưu sẽ thay thế kho từ, thống kê, lịch sử và cài đặt hiện tại. Tiếp tục?')) return
        const restored = backupStorage.restore(contents)
        if (onRestore) onRestore(restored)
        else onChange(restored)
        setSelectedId(restored[0]?.id ?? '')
        setTransferMessage('Đã khôi phục bản sao lưu.')
      }
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Không thể đọc tệp đã chọn.')
    }
  }

  return <div className="page-shell library-page">
    <header className="topbar">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Trang chủ</button>
      <span className="brand-mini"><BrandMark /> WORD CASTLE</span>
      <span className="topbar-tag">KHO TỪ VỰNG</span>
    </header>
    <div className="page-heading">
      <div><span className="eyebrow">XÂY KHO TỪ CỦA BẠN</span><h1>Kho từ vựng <span>📚</span></h1><p>Tạo bộ từ riêng và biến mỗi chữ cái thành một chiến thắng.</p></div>
      <div className="heading-count"><strong>{sets.reduce((sum, set) => sum + set.words.length, 0)}</strong><span>TỪ ĐÃ LƯU</span></div>
    </div>
    <div className="transfer-panel panel"><strong>Dữ liệu từ vựng</strong><div>
      <button type="button" onClick={() => selected && download(`${selected.name}.json`, exportSetJson(selected))} disabled={!selected}>Xuất bộ (JSON)</button>
      <button type="button" onClick={() => csvInput.current?.click()} disabled={!selected}>Nhập CSV vào bộ</button>
      <button type="button" onClick={() => jsonInput.current?.click()}>Nhập bộ JSON</button>
      <button type="button" onClick={() => download('word-castle-backup.json', backupStorage.export())}>Sao lưu toàn bộ</button>
      <button type="button" onClick={() => backupInput.current?.click()}>Khôi phục sao lưu</button>
    </div><input ref={csvInput} type="file" accept=".csv,text/csv" aria-label="Chọn tệp CSV" onChange={event => void upload(event, 'csv')} hidden />
    <input ref={jsonInput} type="file" accept=".json,application/json" aria-label="Chọn tệp bộ từ JSON" onChange={event => void upload(event, 'json')} hidden />
    <input ref={backupInput} type="file" accept=".json,application/json" aria-label="Chọn tệp sao lưu" onChange={event => void upload(event, 'backup')} hidden />
    {transferMessage && <p role="status">{transferMessage}</p>}</div>
    <div className="library-layout">
      <aside className="sets-panel panel">
        <div className="panel-title"><h2>Bộ từ của bạn</h2><span>{sets.length} bộ</span></div>
        <div className="set-list">
          {sets.map(set => <button key={set.id} className={`set-card ${selected?.id === set.id ? 'selected' : ''}`} onClick={() => { setSelectedId(set.id); setQuery(''); setListPage(0); cancelEdit() }}>
            <span className="set-icon"><BookOpen size={20} /></span><span className="set-meta"><strong>{set.name}{set.id.startsWith('sample-') && <em className="sample-badge">Mẫu</em>}</strong><small>{set.words.length}/{MAX_WORDS_PER_SET} từ</small></span><span className="set-chevron">›</span>
          </button>)}
          {sets.length === 0 && <p className="empty-copy">Chưa có bộ từ nào. Tạo một bộ ở bên dưới nhé!</p>}
        </div>
        <form className="new-set-form" onSubmit={event => { event.preventDefault(); createSet() }}>
          <label htmlFor="new-set">TẠO BỘ TỪ MỚI</label>
          <div className="input-action"><input id="new-set" value={newSetName} onChange={event => setNewSetName(event.target.value)} placeholder="Ví dụ: Animals" maxLength={50} /><button aria-label="Tạo bộ từ" title="Tạo bộ từ"><Plus size={20} /></button></div>
        </form>
      </aside>
      <section className="words-panel panel">
        {selected ? <>
          <div className="words-header"><div><span className="eyebrow">BỘ TỪ ĐANG CHỌN</span><h2>{selected.name}</h2><p>{selected.words.length}/{MAX_WORDS_PER_SET} từ vựng · {selected.words.length >= MAX_WORDS_PER_SET ? 'Bộ từ đã đầy' : 'Sẵn sàng để luyện tập'}</p></div><div className="words-actions"><button className="icon-danger" title="Xóa bộ từ" aria-label="Xóa bộ từ" onClick={() => removeSet(selected.id)}><Trash2 size={19} /></button><button className="button button-primary" onClick={() => onPlay(selected.id)} disabled={selected.words.length === 0}><Play size={18} fill="currentColor" /> Chơi bộ này</button></div></div>
          <div className="word-search"><input aria-label="Tìm từ trong bộ" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt..." value={query} onChange={event => { setQuery(event.target.value); setListPage(0) }} /><span>{filteredWords.length} từ phù hợp</span></div>
          <div className="word-table"><div className="table-heading"><span>TỪ TIẾNG ANH</span><span>NGHĨA TIẾNG VIỆT</span><span></span></div>
            {pageWords.map(({ item, index }) => <div className="word-row" key={item.id}><span className="word-name"><i>{String(index + 1).padStart(2, '0')}</i>{item.word}</span><span className="word-meaning">{item.meaning}</span><span className="row-actions"><button title={`Sửa ${item.word}`} aria-label={`Sửa ${item.word}`} onClick={() => editWord(item)}><Edit3 size={17} /></button><button title={`Xóa ${item.word}`} aria-label={`Xóa ${item.word}`} onClick={() => updateSet({ ...selected, words: selected.words.filter(word => word.id !== item.id) })}><Trash2 size={17} /></button></span></div>)}
            {selected.words.length === 0 && <div className="empty-words">Bộ từ đang trống. Thêm từ đầu tiên để bắt đầu chơi.</div>}
            {selected.words.length > 0 && filteredWords.length === 0 && <div className="empty-words">Không tìm thấy từ phù hợp.</div>}
          </div>
          {pageCount > 1 && <nav className="word-pagination" aria-label="Các trang từ vựng"><button type="button" onClick={() => setListPage(currentPage - 1)} disabled={currentPage === 0}>← Trước</button><span>Trang {currentPage + 1}/{pageCount}</span><button type="button" onClick={() => setListPage(currentPage + 1)} disabled={currentPage === pageCount - 1}>Tiếp →</button></nav>}
          <form className="add-word-form" onSubmit={event => { event.preventDefault(); saveWord() }}><div><span className="eyebrow">{editingId ? 'CHỈNH SỬA TỪ' : 'THÊM TỪ MỚI'}</span><div className="word-inputs"><input aria-label="Từ tiếng Anh" value={word} onChange={event => setWord(event.target.value)} placeholder="Từ tiếng Anh" maxLength={14} /><input aria-label="Nghĩa tiếng Việt" value={meaning} onChange={event => setMeaning(event.target.value)} placeholder="Nghĩa tiếng Việt" maxLength={100} /></div></div><div className="form-buttons">{editingId && <button type="button" className="button button-ghost" onClick={cancelEdit}><X size={17} /> Hủy</button>}<button className="button button-teal" type="submit" disabled={!editingId && selected.words.length >= MAX_WORDS_PER_SET}>{editingId ? <Save size={18} /> : <Plus size={19} />}{editingId ? 'Lưu sửa' : 'Thêm từ'}</button></div></form>
          <div className="library-tip"><Check size={16} /> Chỉ dùng từ tiếng Anh gồm các chữ cái A–Z để game nhận diện chính xác.</div>
        </> : <div className="no-selection"><BookOpen size={40} /><h2>Chưa có bộ từ</h2><p>Đặt tên bộ từ ở khung bên trái để bắt đầu.</p></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
      </section>
    </div>
  </div>
}
