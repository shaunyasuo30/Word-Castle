import { ArrowLeft } from 'lucide-react'
import BrandMark from './BrandMark'
import { gameHistoryStorage } from '../services/gameHistoryStorage'
import { learningStatsStorage } from '../services/learningStatsStorage'
import { weakness } from '../game/practice'

interface Props { onBack: () => void }

export default function StatisticsPage({ onBack }: Props) {
  const { games: history, summary } = gameHistoryStorage.read()
  const stats = Object.values(learningStatsStorage.load())
  const games = summary.totalGames
  const practiced = summary.totalWordsPracticed
  const averageAccuracy = games ? Math.round(summary.accuracySum / games) : 0
  const mastered = stats.filter(word => word.completed >= 3 &&
    word.correctAttempts / Math.max(1, word.correctAttempts + word.wrongAttempts) >= 0.9 &&
    word.completed >= word.missed * 2).length
  const weak = stats.filter(word => weakness(word) > 0).sort((a, b) => weakness(b) - weakness(a))
  const bestScore = summary.bestScore

  return <div className="statistics-page page-shell">
    <header className="topbar"><button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Trang chủ</button><span className="brand-mini"><BrandMark /> WORD CASTLE</span><span className="topbar-tag">THỐNG KÊ HỌC TẬP</span></header>
    <div className="page-heading"><div><span className="eyebrow">HÀNH TRÌNH HỌC TỪ</span><h1>Thống kê</h1><p>Kết quả từ các ván đã hoàn thành trên trình duyệt này.</p></div></div>
    <div className="stats-grid">
      {[
        ['Tổng số ván', games], ['Từ đã luyện', practiced], ['Độ chính xác trung bình', `${averageAccuracy}%`],
        ['Từ đã thành thạo', mastered], ['Từ yếu', weak.length], ['Điểm cao nhất', bestScore],
      ].map(([label, value]) => <div className="stat-card panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <section className="stats-section panel"><h2>Từ cần luyện thêm</h2>
      {weak.length ? <div className="weak-word-list">{weak.slice(0, 10).map(word => <div key={`${word.setId}:${word.wordId}`}><strong>{word.word}</strong><span>{word.meaning}</span><small>Sai {word.wrongAttempts} chữ · Bỏ lỡ {word.missed} lần</small></div>)}</div>
        : <p>Chưa có từ yếu được ghi nhận.</p>}
    </section>
    <section className="stats-section panel"><h2>Ván gần đây</h2>
      {history.length ? <div className="history-list">{history.slice(0, 10).map(game => <div key={game.id}><strong>{game.setName}</strong><span>{new Date(game.playedAt).toLocaleString('vi-VN')} · {game.score} điểm · {game.accuracy}% chính xác</span></div>)}</div>
        : <p>Chưa có ván nào được lưu.</p>}
    </section>
  </div>
}
