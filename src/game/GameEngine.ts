import { EXPLOSION_DURATION, FIELD, FINAL_WALL_HIT_DURATION, WALL_HIT_DURATION, FALL_SPEED } from './config'
import { shuffle } from '../utils/shuffle'
import { scoreWord } from './scoring'
import type { VocabularyItem } from '../types/vocabulary'
import type { Bullet, FloatingFeedback, GameConfig, GameSnapshot, GameSoundEvent, GameState, Particle, WordResult } from './types'

type Effect = 'correct' | 'wrong' | 'destroy' | 'wall'

export class GameEngine {
  readonly config: GameConfig
  readonly total: number
  readonly queue: VocabularyItem[]
  state: GameState = 'READY'
  started = false
  paused = false
  word: VocabularyItem | null = null
  wordX = 500
  wordY = 65
  letterIndex = 0
  bullet: Bullet | null = null
  pendingKeys: string[] = []
  particles: Particle[] = []
  feedback: FloatingFeedback[] = []
  muzzleFlash = 0
  wrongLetter = ''
  feedbackTimer = 0
  transitionTimer = 0
  countdownTimer = 3.6
  shake = 0
  recoil = 0
  aimAngle = 0
  score = 0
  lives: number
  destroyed = 0
  missed = 0
  correctKeys = 0
  wrongKeys = 0
  elapsed = 0
  wordNumber = 0
  combo = 0
  bestCombo = 0
  currentCorrectLetters = 0
  currentWrongLetters = 0
  wordResults: WordResult[] = []
  onChange: (snapshot: GameSnapshot) => void = () => {}
  onWord: (word: string) => void = () => {}
  onSound: (event: GameSoundEvent) => void = () => {}
  onFinish: (snapshot: GameSnapshot) => void = () => {}

  constructor(words: VocabularyItem[], config: GameConfig) {
    this.config = { ...config }
    this.queue = shuffle(words)
    this.total = words.length
    this.lives = config.startingLives
  }

  get snapshot(): GameSnapshot {
    const countdown = this.state === 'READY'
      ? this.countdownTimer > 0.95 ? String(Math.ceil(this.countdownTimer - 0.95)) : 'GO!'
      : ''
    return {
      state: this.state, paused: this.paused, started: this.started, countdown, score: this.score, lives: this.lives,
      destroyed: this.destroyed, missed: this.missed, correctKeys: this.correctKeys,
      wrongKeys: this.wrongKeys, total: this.total, elapsed: this.elapsed,
      wordNumber: this.wordNumber, activeWord: this.word, bufferedKeys: this.pendingKeys.length,
      combo: this.combo, bestCombo: this.bestCombo, wordResults: [...this.wordResults],
    }
  }

  private emit(): void { this.onChange(this.snapshot) }

  setFallingSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return
    this.config.fallingSpeed = Math.max(FALL_SPEED.min, Math.min(FALL_SPEED.max, speed))
  }

  begin(): void {
    if (this.state !== 'READY' || this.started) return
    this.started = true
    this.emit()
  }

  pause(): void {
    if (!this.started || this.paused || this.state === 'GAME_OVER' || this.state === 'VICTORY') return
    this.paused = true
    this.emit()
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.emit()
  }

  private showFeedback(text: string, color: string, x = this.wordX, y = this.wordY): void {
    this.feedback.push({ text, x, y, color, life: 0.75, maxLife: 0.75 })
  }

  private recordWord(outcome: WordResult['outcome'], score = 0): void {
    if (!this.word) return
    this.wordResults.push({
      wordId: this.word.id, word: this.word.word, meaning: this.word.meaning,
      outcome, correctLetters: this.currentCorrectLetters,
      wrongLetters: this.currentWrongLetters, score,
    })
  }

  getTargetPoint(): { x: number; y: number } {
    if (!this.word) return { x: FIELD.cannonX, y: 220 }
    const length = this.word.word.length
    const cell = length > 8 ? 42 : 48
    const width = length * cell + 30
    const index = Math.min(this.letterIndex, length - 1)
    return {
      x: this.wordX - width / 2 + 15 + index * cell + (cell - 5) / 2,
      y: this.wordY + 50,
    }
  }

  private startNextWord(): void {
    const next = this.queue.shift()
    if (!next) {
      this.state = this.missed === 0 ? 'VICTORY' : 'GAME_OVER'
      this.onSound(this.state === 'VICTORY' ? 'victory' : 'game-over')
      this.emit()
      this.onFinish(this.snapshot)
      return
    }
    this.word = next
    this.wordNumber++
    this.wordX = 400 + Math.random() * 200
    this.wordY = 55
    this.letterIndex = 0
    this.currentCorrectLetters = 0
    this.currentWrongLetters = 0
    this.wrongLetter = ''
    this.feedbackTimer = 0
    this.bullet = null
    this.pendingKeys = []
    this.state = 'PLAYING'
    this.emit()
    this.onWord(next.word)
  }

  shoot(character: string): boolean {
    if (this.paused || this.state !== 'PLAYING' || this.pendingKeys.length >= 32 || !/^[a-z]$/i.test(character)) return false
    this.pendingKeys.push(character.toUpperCase())
    this.launchNextBullet()
    this.emit()
    return true
  }

  private launchNextBullet(): void {
    if (this.bullet || this.state !== 'PLAYING') return
    const character = this.pendingKeys.shift()
    if (!character) return
    this.bullet = {
      x: FIELD.cannonX + Math.sin(this.aimAngle) * 69,
      y: FIELD.cannonY - Math.cos(this.aimAngle) * 69,
      character,
    }
    this.recoil = 0.16
    this.muzzleFlash = 0.09
    this.onSound('shoot')
  }

  update(rawDt: number): void {
    if (this.paused) return
    const dt = Math.min(Math.max(rawDt, 0), 0.05)
    this.updateEffects(dt)

    if (this.state === 'READY') {
      if (!this.started) return
      const old = this.snapshot.countdown
      this.countdownTimer -= dt
      if (this.countdownTimer <= 0) this.startNextWord()
      else if (old !== this.snapshot.countdown) {
        if (this.snapshot.countdown === 'GO!') this.onSound('go')
        this.emit()
      }
      return
    }
    if (this.state === 'GAME_OVER' || this.state === 'VICTORY') return
    this.elapsed += dt

    if (this.state === 'WORD_REVEALED' || this.state === 'WORD_DESTROYED' || this.state === 'WALL_HIT') {
      this.transitionTimer -= dt
      if (this.transitionTimer <= 0) {
        if (this.state === 'WORD_REVEALED') {
          this.state = 'WORD_DESTROYED'
          this.transitionTimer = EXPLOSION_DURATION
          this.shake = 0.28
          this.burst(this.wordX, this.wordY + 52, 'destroy', 72)
          this.onSound('explode')
          this.emit()
        } else if (this.lives === 0) {
          this.state = 'GAME_OVER'
          this.onSound('game-over')
          this.emit()
          this.onFinish(this.snapshot)
        } else this.startNextWord()
      }
      return
    }

    if (!this.word) return
    if (this.feedbackTimer > 0) {
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt)
      if (this.feedbackTimer === 0) this.wrongLetter = ''
    }

    // Resolve a bullet before advancing the falling object. A completed word wins
    // if its final projectile arrives in the same frame as the wall collision.
    if (this.bullet) this.updateBullet(dt)
    if (this.state !== 'PLAYING') return
    this.wordY += this.config.fallingSpeed * dt
    if (this.wordY + 90 >= FIELD.wallY) this.hitWall()
  }

  private updateBullet(dt: number): void {
    if (!this.bullet || !this.word) return
    const { x: targetX, y: targetY } = this.getTargetPoint()
    const dx = targetX - this.bullet.x
    const dy = targetY - this.bullet.y
    const distance = Math.hypot(dx, dy)
    const step = this.config.bulletSpeed * dt
    if (distance <= step + 20) {
      const character = this.bullet.character
      this.bullet = null
      this.resolveHit(character)
      this.launchNextBullet()
      this.emit()
    } else {
      this.bullet.x += dx / distance * step
      this.bullet.y += dy / distance * step
    }
  }

  private resolveHit(character: string): void {
    if (!this.word || this.state !== 'PLAYING') return
    // The projectile's character is judged only at collision, never at keydown.
    if (character === this.word.word[this.letterIndex].toUpperCase()) {
      this.correctKeys++
      this.currentCorrectLetters++
      this.combo++
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      if (this.combo > 1) this.showFeedback(`Combo x${this.combo}`, '#ffe89a', this.wordX, this.wordY - 23)
      this.onSound('hit')
      this.letterIndex++
      this.wrongLetter = ''
      this.feedbackTimer = 0
      this.burst(this.wordX, this.wordY + 54, 'correct', 9)
      if (this.letterIndex === this.word.word.length) {
        this.state = 'WORD_REVEALED'
        this.destroyed++
        const points = scoreWord(this.config.baseScore, this.combo)
        this.score += points
        this.recordWord(this.currentWrongLetters === 0 ? 'perfect' : 'completed', points)
        this.showFeedback(`+${points}`, '#fff0a5', this.wordX, this.wordY - 50)
        if (this.currentWrongLetters === 0) this.showFeedback('Perfect!', '#8bf3c7', this.wordX, this.wordY - 82)
        this.transitionTimer = 1.15
        this.pendingKeys = []
      }
    } else {
      this.wrongKeys++
      this.currentWrongLetters++
      this.combo = 0
      this.onSound('wrong')
      this.wrongLetter = character
      this.feedbackTimer = 0.43
      this.shake = 0.1
      this.burst(this.wordX, this.wordY + 54, 'wrong', 11)
    }
  }

  private hitWall(): void {
    if (this.state !== 'PLAYING') return
    this.state = 'WALL_HIT'
    this.bullet = null
    this.pendingKeys = []
    this.missed++
    this.lives--
    this.combo = 0
    this.recordWord('missed')
    this.showFeedback('Miss!', '#ff9c9f', this.wordX, FIELD.wallY - 85)
    this.shake = this.lives === 0 ? 0.9 : 0.46
    this.transitionTimer = this.lives === 0 ? FINAL_WALL_HIT_DURATION : WALL_HIT_DURATION
    this.burst(this.wordX, FIELD.wallY - 12, 'wall', this.lives === 0 ? 74 : 52)
    this.onSound('wall')
    this.emit()
  }

  private updateEffects(dt: number): void {
    const target = this.getTargetPoint()
    const desiredAngle = Math.atan2(target.x - FIELD.cannonX, FIELD.cannonY - target.y)
    this.aimAngle += (desiredAngle - this.aimAngle) * (1 - Math.exp(-14 * dt))
    this.shake = Math.max(0, this.shake - dt)
    this.recoil = Math.max(0, this.recoil - dt)
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt)
    this.feedback = this.feedback.filter(item => item.life > 0)
    for (const item of this.feedback) {
      item.life -= dt
      item.y -= 24 * dt
    }
    this.particles = this.particles.filter(p => p.life > 0)
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 210 * dt
      p.life -= dt
    }
  }

  private burst(x: number, y: number, effect: Effect, count: number): void {
    const palettes: Record<Effect, string[]> = {
      correct: ['#54dba7', '#b7f7cd', '#ffffff'],
      wrong: ['#ff6775', '#ffc1a9', '#ffffff'],
      destroy: ['#ffcf6b', '#ff8f66', '#6ce0bd', '#ffffff'],
      wall: ['#d0a979', '#947258', '#e9d7af', '#ffad67'],
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * (effect === 'destroy' ? 310 : effect === 'wall' ? 210 : 175)
      const life = effect === 'destroy' ? 0.55 + Math.random() * 0.45 : 0.4 + Math.random() * 0.55
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30,
        life, maxLife: life, color: palettes[effect][i % palettes[effect].length],
        size: (effect === 'destroy' ? 3 : 2) + Math.random() * (effect === 'destroy' ? 7 : 5),
      })
    }
  }
}
