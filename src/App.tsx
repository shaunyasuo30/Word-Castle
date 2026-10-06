import BrandMark from './components/BrandMark'
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Headphones, Keyboard, Moon, Play, Shield, Sparkles, Sun, Volume2 } from 'lucide-react'
import VocabularyPage from './components/VocabularyPage'
import GamePage from './components/GamePage'
import Snowfall from './components/Snowfall'
import { vocabularyStorage } from './services/vocabularyStorage'
import type { VocabularySet } from './types/vocabulary'
import { loadTheme, saveTheme } from './theme'
import { MAX_WORDS_PER_SET } from './data/sampleSets'
import { soundEffects } from './services/soundEffects'

type Page = 'home' | 'library' | 'select' | 'game'

export default function App() {
  const [sets, setSets] = useState<VocabularySet[]>(vocabularyStorage.load)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState('')
  const [storageError, setStorageError] = useState('')
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => saveTheme(theme), [theme])
  useEffect(() => {
    const playButtonSound = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null
      if (button && !button.disabled) soundEffects.play('button')
    }
    document.addEventListener('click', playButtonSound, true)
    return () => document.removeEventListener('click', playButtonSound, true)
  }, [])

  function saveSets(next: VocabularySet[]): void {
    setSets(next)
    try { vocabularyStorage.save(next); setStorageError('') }
    catch { setStorageError('Không thể lưu dữ liệu trên trình duyệt này. Hãy kiểm tra quyền lưu trữ.') }
  }

  function start(id: string): void {
    const set = sets.find(item => item.id === id)
    if (!set || set.words.length === 0) return
    setSelectedId(id)
    setPage('game')
  }

  const selected = sets.find(set => set.id === selectedId)

  return <>
    <Snowfall />
    <button className="theme-toggle" type="button" onClick={() => setTheme(current => current === 'night' ? 'day' : 'night')} aria-label={theme === 'night' ? 'Bật chế độ ban ngày' : 'Bật chế độ ban đêm'} aria-pressed={theme === 'day'} title={theme === 'night' ? 'Chế độ ban ngày' : 'Chế độ ban đêm'}>
      {theme === 'night' ? <Sun size={19} /> : <Moon size={19} />}
      <span>{theme === 'night' ? 'Ban ngày' : 'Ban đêm'}</span>
    </button>
    {storageError && <div className="storage-error" role="alert">{storageError}</div>}
    {page === 'home' && <div className="home-page">
      <header className="home-nav page-shell"><div className="brand"><BrandMark /><span>WORD<span>CASTLE</span></span></div><nav><button onClick={() => setPage('library')}>Kho từ vựng</button><button className="nav-play" onClick={() => setPage('select')}><Play size={15} fill="currentColor" /> Chơi ngay</button></nav></header>
      <main className="page-shell home-main"><div className="hero-copy"><div className="hero-badge"><Sparkles size={16} /> HỌC TIẾNG ANH THEO CÁCH THẬT VUI</div><h1>Nghe từ.<br /><span>Bắn chữ.</span><br />Giữ thành!</h1><p>Biến mỗi từ vựng thành một cuộc phiêu lưu. Lắng nghe, gõ đúng từng chữ cái và bảo vệ lâu đài của bạn.</p><div className="hero-actions"><button className="button button-primary button-large" onClick={() => setPage('select')}><Play size={20} fill="currentColor" /> Bắt đầu chơi <ArrowRight size={19} /></button><button className="button button-outline button-large" onClick={() => setPage('library')}><BookOpen size={20} /> Kho từ vựng</button></div><div className="hero-note"><span className="note-avatars">A B C</span><span>Nhiều bộ từ mẫu · Tối đa {MAX_WORDS_PER_SET} từ mỗi bộ</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-level-tag">✦ LEVEL 01 · SPELL & DEFEND</div><div className="art-score-stamp">+100 <small>ĐIỂM MỖI TỪ</small></div><div className="art-stars star-1">✦</div><div className="art-stars star-2">✦</div><div className="art-moon"></div><div className="art-cloud cloud-1"></div><div className="art-cloud cloud-2"></div><div className="art-word"><span className="art-chain"></span><span className="art-chain right"></span><div className="art-word-face"><div className="art-letters"><span>A</span><span>P</span><span>P</span><span>L</span><span>E</span></div><div className="art-crate-smile">⌣</div></div></div><div className="art-shot shot-1"></div><div className="art-shot shot-2"></div><div className="art-cannon"><div className="cannon-barrel"></div><div className="cannon-base"></div></div><div className="art-wall"></div><div className="art-ground"></div><span className="art-sound"><Volume2 size={21} /></span></div></main>
      <section className="features page-shell"><div className="feature-card"><span className="feature-icon purple"><Headphones size={25} /></span><div><h3>Nghe & ghi nhớ</h3><p>Luyện nghe và chính tả với giọng đọc tiếng Anh.</p></div></div><div className="feature-card"><span className="feature-icon peach"><Keyboard size={25} /></span><div><h3>Gõ để chiến đấu</h3><p>Mỗi chữ bạn gõ là một viên đạn bảo vệ thành.</p></div></div><div className="feature-card"><span className="feature-icon mint"><Shield size={25} /></span><div><h3>Bộ từ của riêng bạn</h3><p>Tự tạo và lưu bộ từ để luyện tập bất cứ lúc nào.</p></div></div></section>
      <footer className="home-footer page-shell"><span>WORD CASTLE © 2026</span><span>Học vui hơn, nhớ lâu hơn ✦</span></footer>
    </div>}
    {page === 'library' && <VocabularyPage sets={sets} onChange={saveSets} onBack={() => setPage('home')} onPlay={start} />}
    {page === 'select' && <div className="page-shell selection-page"><header className="topbar"><button className="back-button" onClick={() => setPage('home')}>← Trang chủ</button><span className="brand-mini"><BrandMark /> WORD CASTLE</span><span className="topbar-tag">CHỌN BỘ TỪ</span></header><div className="selection-heading"><span className="eyebrow">TRƯỚC KHI XUẤT PHÁT</span><h1>Chọn bộ từ để chơi</h1><p>Mỗi bộ từ là một màn bảo vệ lâu đài. Bạn muốn luyện bộ nào?</p></div><div className="selection-grid">{sets.map((set, index) => <div className="choice-card" key={set.id}><div className={`choice-icon choice-${index % 3}`}><BookOpen size={29} /></div><span className="choice-label">BỘ TỪ #{String(index + 1).padStart(2, '0')}</span><h2>{set.name}</h2><p>{set.words.length}/{MAX_WORDS_PER_SET} từ · Luyện nghe và chính tả</p><button className="button button-primary" onClick={() => start(set.id)} disabled={set.words.length === 0}><Play size={17} fill="currentColor" /> {set.words.length ? 'Bắt đầu' : 'Bộ từ trống'}</button></div>)}<button className="choice-add" onClick={() => setPage('library')}><span>＋</span><strong>Tạo bộ từ mới</strong><small>Thêm thử thách của riêng bạn</small></button></div>{sets.length === 0 && <p className="empty-copy">Chưa có bộ từ nào. Hãy tạo một bộ để bắt đầu.</p>}</div>}
    {page === 'game' && selected && <GamePage set={selected} onHome={() => setPage('home')} theme={theme} />}
  </>
}
