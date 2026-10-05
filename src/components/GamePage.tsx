import BrandMark from './BrandMark'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Expand, Heart, Home, Minimize, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react'
import { GameEngine } from '../game/GameEngine'
import { FALL_SPEED, GAME_CONFIG, FIELD } from '../game/config'
import { renderGame } from '../game/render'
import type { GameSnapshot } from '../game/types'
import { speechService, type Accent } from '../services/speechService'
import { soundEffects } from '../services/soundEffects'
import { getAudioVolume, setAudioVolume } from '../services/audioVolume'
import type { VocabularySet } from '../types/vocabulary'
import type { Theme } from '../theme'

interface Props { set: VocabularySet; onHome: () => void; theme?: Theme }

function savedSpeed(): number {
  try {
    const value = Number(localStorage.getItem('word-castle:fall-speed'))
    return value >= FALL_SPEED.min && value <= FALL_SPEED.max ? value : FALL_SPEED.default
  } catch { return FALL_SPEED.default }
}

function GameSession({ set, onHome, onReplay, theme = 'night' }: Props & { onReplay: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [speed, setSpeed] = useState(savedSpeed)
  const [volume, setVolume] = useState(getAudioVolume)
  const [muted, setMuted] = useState(() => soundEffects.isMuted())
  const [fullscreen, setFullscreen] = useState(false)
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => new GameEngine(set.words, GAME_CONFIG).snapshot)
  const [voices, setVoices] = useState(() => speechService.getEnglishVoices())
  const [accent, setAccent] = useState<Accent>(() => speechService.getAccent())
  const [voiceURI, setVoiceURI] = useState(() => speechService.getSelectedVoiceURI())
  const [recording, setRecording] = useState(() => speechService.getCurrentRecording())
  const themeRef = useRef(theme)
  themeRef.current = theme
  const speechAvailable = speechService.supported()
  const activeVoice = voices.find(voice => voice.voiceURI === voiceURI) ?? voices[0]

  useEffect(() => speechService.subscribeVoices(() => setVoices(speechService.getEnglishVoices())), [])
  useEffect(() => speechService.subscribeRecording(setRecording), [])
  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const engine = new GameEngine(set.words, { ...GAME_CONFIG, fallingSpeed: savedSpeed() })
    engineRef.current = engine
    engine.onChange = setSnapshot
    engine.onSound = event => soundEffects.play(event)
    engine.onWord = word => {
      speechService.prefetch(engine.queue.slice(0, 3).map(item => item.word))
      speechService.speak(word)
    }
    setSnapshot(engine.snapshot)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    let frame = 0
    let previous = 0
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const tick = (now: number) => {
      if (previous) engine.update((now - previous) / 1000)
      previous = now
      if (ctx) renderGame(ctx, engine, reduceMotion ? 0 : now / 1000, themeRef.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        !/^[a-z]$/i.test(event.key) ||
        (event.target instanceof HTMLElement &&
          event.target.closest('input, select, textarea, [contenteditable="true"]'))) return
      engine.shoot(event.key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      speechService.stop()
      soundEffects.stopMusic()
      engineRef.current = null
    }
  }, [set])

  const ended = snapshot.state === 'GAME_OVER' || snapshot.state === 'VICTORY'
  const accuracy = snapshot.correctKeys + snapshot.wrongKeys
    ? Math.round(snapshot.correctKeys / (snapshot.correctKeys + snapshot.wrongKeys) * 100) : 0
  const replaySpeech = (slow = false) => {
    if (snapshot.activeWord && snapshot.state === 'PLAYING') speechService.speak(snapshot.activeWord.word, slow)
  }
  const beginGame = () => {
    soundEffects.unlock()
    void soundEffects.preload()
    soundEffects.play('start')
    speechService.prefetch(engineRef.current?.queue.slice(0, 6).map(item => item.word) ?? [])
    speechService.prime()
    engineRef.current?.begin()
  }
  const changeVoice = (uri: string) => {
    speechService.selectVoice(uri)
    setVoiceURI(uri)
  }
  const changeAccent = (next: Accent) => {
    speechService.setAccent(next)
    setAccent(next)
    setVoiceURI('')
    setVoices(speechService.getEnglishVoices())
    if (snapshot.state === 'PLAYING' && snapshot.activeWord) speechService.speak(snapshot.activeWord.word)
  }
  const changeSpeed = (value: number) => {
    setSpeed(value)
    engineRef.current?.setFallingSpeed(value)
    try { localStorage.setItem('word-castle:fall-speed', String(value)) } catch { /* keep current session setting */ }
  }
  const changeVolume = (value: number) => {
    const next = setAudioVolume(value)
    setVolume(next)
    soundEffects.applyVolume(next)
    speechService.applyVolume(next)
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await frameRef.current?.requestFullscreen()
    } catch { setFullscreen(false) }
  }
  const toggleSounds = () => {
    soundEffects.setMuted(!muted)
    setMuted(!muted)
  }

  return <div className="game-page page-shell">
    <header className="topbar game-topbar"><button className="back-button" onClick={onHome}><ArrowLeft size={19} /> Thoát game</button><span className="brand-mini"><BrandMark /> WORD CASTLE</span><span className="topbar-tag">PHÒNG THỦ TỪ VỰNG</span></header>
    <div className="game-heading"><div><span className="eyebrow">BỘ TỪ: {set.name.toUpperCase()}</span><h1>Bảo vệ lâu đài!</h1></div><div className="game-heading-aside"><span className="game-level-chip">✦ SPELL QUEST</span><p>Nghe thật kỹ, gõ từng chữ cái và bắn hạ mục tiêu.</p></div></div>
    <div className="game-frame" ref={frameRef}>
      <div className="game-hud">
        <div className="hud-score"><small>ĐIỂM SỐ</small><strong>{snapshot.score.toLocaleString('vi-VN')}</strong></div>
        <div className="hud-progress"><small>TIẾN ĐỘ</small><strong>{Math.min(snapshot.wordNumber, snapshot.total)} <span>/ {snapshot.total} từ</span></strong></div>
        <div className="hud-lives"><small>MẠNG CÒN LẠI</small><div>{Array.from({ length: GAME_CONFIG.startingLives }, (_, i) => <Heart key={i} size={25} fill={i < snapshot.lives ? '#ff7487' : '#68738a'} color={i < snapshot.lives ? '#ff7487' : '#68738a'} />)}</div></div>
        <div className="hud-voice"><small>GIỌNG ĐỌC</small><div className="hud-voice-options"><div className="accent-switch" role="group" aria-label="Chọn giọng Anh Anh hoặc Anh Mỹ"><button className={accent === 'en-GB' ? 'active' : ''} aria-pressed={accent === 'en-GB'} onClick={() => changeAccent('en-GB')}>🇬🇧 UK</button><button className={accent === 'en-US' ? 'active' : ''} aria-pressed={accent === 'en-US'} onClick={() => changeAccent('en-US')}>🇺🇸 US</button></div><label className="voice-picker"><span className="sr-only">Giọng dự phòng</span><select aria-label="Chọn giọng dự phòng" value={voiceURI} onChange={event => changeVoice(event.target.value)} disabled={voices.length === 0}><option value="">Giọng đề xuất</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select></label></div></div>
        <div className="hud-speed"><label htmlFor="fall-speed">TỐC ĐỘ RƠI <b>{speed < 16 ? 'Chậm' : speed > 28 ? 'Nhanh' : 'Vừa'}</b></label><input id="fall-speed" type="range" min={FALL_SPEED.min} max={FALL_SPEED.max} step={FALL_SPEED.step} value={speed} onChange={event => changeSpeed(Number(event.target.value))} aria-label="Tốc độ rơi" /><label htmlFor="game-volume" className="volume-label">ÂM LƯỢNG <b>{volume}%</b></label><input id="game-volume" type="range" min="0" max="100" step="5" value={volume} onChange={event => changeVolume(Number(event.target.value))} aria-label="Âm lượng" /></div>
        <div className="hud-actions"><button type="button" className="hud-icon-button" onClick={toggleSounds} aria-label={muted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'} title={muted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button><button type="button" className="hud-icon-button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Thu nhỏ màn hình gameplay' : 'Phóng to màn hình gameplay'} title={fullscreen ? 'Thu nhỏ màn hình gameplay' : 'Phóng to màn hình gameplay'}>{fullscreen ? <Minimize size={19} /> : <Expand size={19} />}</button></div>
      </div>
      <div className="mission-track" aria-label={`Đã xử lý ${snapshot.destroyed + snapshot.missed} trên ${snapshot.total} từ`}><span style={{ width: `${snapshot.total ? (snapshot.destroyed + snapshot.missed) / snapshot.total * 100 : 0}%` }} /></div>
      <div className="canvas-wrap"><div className="canvas-stage"><canvas ref={canvasRef} width={FIELD.width} height={FIELD.height} aria-label="Trò chơi bảo vệ lâu đài" />
        {snapshot.state === 'READY' && (snapshot.started
          ? <div className="center-overlay countdown-overlay"><span>SẴN SÀNG CHƯA?</span><strong key={snapshot.countdown} className={snapshot.countdown === 'GO!' ? 'go' : ''}>{snapshot.countdown}</strong><small>Chuẩn bị nghe từ đầu tiên</small></div>
          : <div className="center-overlay start-overlay"><span className="eyebrow">MÀN CHƠI SẮP BẮT ĐẦU</span><h2>Nghe rõ, bắn chuẩn!</h2><p>Ưu tiên giọng người thật từ Wiktionary. Nếu thiếu bản thu hoặc mất mạng, game dùng giọng trên thiết bị.</p><span className="voice-status">🎙 Bản thu Wiktionary · Giọng dự phòng: {activeVoice ? `${activeVoice.name} · ${activeVoice.lang}` : 'mặc định trên thiết bị'}</span><div className="start-actions"><button className="button button-primary button-large" onClick={beginGame}><Volume2 size={20} /> {speechAvailable ? 'Bật âm thanh & bắt đầu' : 'Bắt đầu không có âm thanh'}</button><button className="button button-ghost preview-voice" onClick={() => speechService.preview()} disabled={!speechAvailable}><Volume1 size={18} /> Nghe thử từ “hello”</button></div></div>)}
        {snapshot.state === 'PLAYING' && <div className="cannon-audio-controls"><button className="listen-button" onClick={() => replaySpeech()} disabled={!speechAvailable}><Volume2 size={18} /> Nghe lại</button><button className="listen-button listen-slow" onClick={() => replaySpeech(true)} disabled={!speechAvailable}><Volume1 size={18} /> Nghe chậm</button></div>}
        {(snapshot.state === 'WORD_REVEALED' || snapshot.state === 'WORD_DESTROYED' || snapshot.state === 'WALL_HIT') && snapshot.activeWord && <div className={`translation-toast ${snapshot.state === 'WORD_DESTROYED' ? 'bursting' : ''} ${snapshot.state === 'WALL_HIT' ? 'missed' : ''}`} role="status"><small>{snapshot.state === 'WALL_HIT' ? 'BỎ LỠ · TỪ CẦN ĐIỀN' : snapshot.state === 'WORD_REVEALED' ? 'CHÍNH XÁC! TỪ VỪA NGHE LÀ' : 'PHÁ HỦY THÀNH CÔNG'}</small><strong>{snapshot.activeWord.word.toUpperCase()}</strong><span>{snapshot.activeWord.meaning}</span></div>}
        {ended && <div className="center-overlay end-overlay"><div className="result-card"><span className="result-sparkle">{snapshot.state === 'VICTORY' ? '✦ ✨ ✦' : '✦ ✦ ✦'}</span><span className="eyebrow">{snapshot.state === 'VICTORY' ? 'XUẤT SẮC!' : 'HÀNH TRÌNH KẾT THÚC'}</span><h2 className={`result-announcement ${snapshot.state === 'VICTORY' ? 'win' : 'lose'}`}>{snapshot.state === 'VICTORY' ? 'VICTORY' : 'DEFEAT'}</h2><p>{snapshot.state === 'VICTORY' ? 'Bạn đã bảo vệ lâu đài thành công.' : 'Luyện thêm một chút và thử lại nhé!'}</p>{snapshot.state === 'GAME_OVER' && snapshot.missed > 0 && snapshot.activeWord && <div className="missed-answer">Từ vừa bỏ lỡ: <strong>{snapshot.activeWord.word.toUpperCase()}</strong><span>{snapshot.activeWord.meaning}</span></div>}<div className="result-stats"><div><strong>{snapshot.score}</strong><span>ĐIỂM</span></div><div><strong>{snapshot.destroyed}</strong><span>PHÁ HỦY</span></div><div><strong>{snapshot.missed}</strong><span>BỎ LỠ</span></div><div><strong>{accuracy}%</strong><span>CHÍNH XÁC</span></div></div>{snapshot.state === 'VICTORY' && <div className="result-time">Thời gian: {Math.round(snapshot.elapsed)} giây</div>}<div className="result-actions"><button className="button button-primary" onClick={onReplay}><RotateCcw size={18} /> Chơi lại</button><button className="button button-ghost" onClick={onHome}><Home size={18} /> Trang chủ</button></div></div></div>}
      </div>
      </div>
      <div className="game-controls"><div className="keyboard-hint"><span className="keyboard-icon">A</span><span>{snapshot.bufferedKeys > 0 ? `${snapshot.bufferedKeys} chữ đang chờ bắn` : 'Gõ nhanh cả từ, pháo sẽ bắn lần lượt'}</span></div><span className="controls-tip">Chọn giọng và tốc độ trên thanh tiến độ · Esc để thu nhỏ</span></div>
    </div>
    <div className="game-footer"><span>🎧 Đeo tai nghe để nghe rõ hơn</span><span>Gõ đúng thứ tự · Mỗi chữ là một viên đạn</span><a href={recording?.pageURL ?? 'https://en.wiktionary.org/wiki/Wiktionary:Audio'} target="_blank" rel="noreferrer">{recording ? `Ghi âm: ${recording.fileName} · tác giả và giấy phép` : 'Nguồn ghi âm: Wiktionary / Wikimedia Commons'}</a></div>
  </div>
}

export default function GamePage(props: Props) {
  const [attempt, setAttempt] = useState(0)
  return <GameSession key={`${props.set.id}-${attempt}`} {...props} onReplay={() => setAttempt(value => value + 1)} />
}
