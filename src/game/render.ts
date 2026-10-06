import { EXPLOSION_DURATION, FIELD, FINAL_WALL_HIT_DURATION, WALL_HIT_DURATION } from './config'
import type { GameEngine } from './GameEngine'
import type { Theme } from '../theme'

const W = FIELD.width
const H = FIELD.height

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, theme: Theme): void {
  ctx.fillStyle = theme === 'day' ? '#ffffffbb' : '#ffffff43'
  ctx.beginPath()
  ctx.ellipse(x, y, 53 * scale, 15 * scale, 0, 0, Math.PI * 2)
  ctx.ellipse(x - 20 * scale, y - 8 * scale, 24 * scale, 19 * scale, 0, 0, Math.PI * 2)
  ctx.ellipse(x + 15 * scale, y - 11 * scale, 31 * scale, 23 * scale, 0, 0, Math.PI * 2)
  ctx.fill()
}

function battlefieldFire(ctx: CanvasRenderingContext2D, x: number, baseY: number, time: number, scale: number, theme: Theme): void {
  ctx.save()
  const intensity = theme === 'night' ? 1 : 0.72
  const flicker = Math.sin(time * 8 + x) * 6 * scale
  const glow = ctx.createRadialGradient(x, baseY - 20 * scale, 2, x, baseY - 20 * scale, 105 * scale)
  glow.addColorStop(0, `rgba(255, 184, 91, ${0.36 * intensity})`)
  glow.addColorStop(0.48, `rgba(255, 105, 65, ${0.14 * intensity})`)
  glow.addColorStop(1, 'rgba(255, 80, 55, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 110 * scale, baseY - 130 * scale, 220 * scale, 150 * scale)

  // Smoke is kept behind the word crate and climbs out of the battlements.
  for (let i = 0; i < 5; i++) {
    const phase = (time * (0.12 + i * 0.007) + i * 0.21) % 1
    const radius = (17 + phase * 25) * scale
    const smokeX = x + Math.sin(time * 0.6 + i * 1.9) * 16 * scale + phase * 18 * scale
    const smokeY = baseY - (45 + phase * 145) * scale
    const smoke = ctx.createRadialGradient(smokeX, smokeY, 2, smokeX, smokeY, radius)
    smoke.addColorStop(0, `rgba(31, 38, 57, ${(1 - phase) * 0.33 * intensity})`)
    smoke.addColorStop(1, 'rgba(31, 38, 57, 0)')
    ctx.fillStyle = smoke
    ctx.beginPath(); ctx.arc(smokeX, smokeY, radius, 0, Math.PI * 2); ctx.fill()
  }

  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * 17 * scale
    const height = (55 + (i % 2) * 23 + Math.sin(time * (7 + i) + i * 2.3) * 12) * scale
    const width = (21 + i % 2 * 7) * scale
    const flame = ctx.createLinearGradient(x + offset, baseY, x + offset, baseY - height)
    flame.addColorStop(0, '#e54a47')
    flame.addColorStop(0.55, '#ff8b46')
    flame.addColorStop(1, '#ffd581')
    ctx.fillStyle = flame
    ctx.globalAlpha = intensity * 0.86
    ctx.beginPath()
    ctx.moveTo(x + offset - width, baseY)
    ctx.quadraticCurveTo(x + offset - width * 0.65, baseY - height * 0.58, x + offset + flicker * 0.3, baseY - height)
    ctx.quadraticCurveTo(x + offset + width * 1.15, baseY - height * 0.46, x + offset + width, baseY)
    ctx.closePath(); ctx.fill()
  }

  ctx.globalAlpha = intensity
  for (let i = 0; i < 13; i++) {
    const phase = (time * (0.32 + i % 3 * 0.07) + i * 0.19) % 1
    const emberX = x + (i % 2 ? 1 : -1) * (9 + i * 5) * scale + Math.sin(time * 1.7 + i) * 8 * scale
    const emberY = baseY - (22 + phase * 155) * scale
    ctx.globalAlpha = (1 - phase) * intensity * 0.8
    ctx.fillStyle = i % 3 ? '#ffb668' : '#fff3ac'
    ctx.beginPath(); ctx.arc(emberX, emberY, (1.2 + i % 3 * 0.55) * scale, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function distantBattle(ctx: CanvasRenderingContext2D, time: number, theme: Theme): void {
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const phase = (time * (0.07 + i * 0.012) + i * 0.37) % 1
    const x = i % 2 ? W - phase * W : phase * W
    const y = 255 + i * 38 - Math.sin(phase * Math.PI) * 46
    ctx.globalAlpha = (theme === 'night' ? 0.38 : 0.23) * Math.sin(phase * Math.PI)
    ctx.strokeStyle = '#ffca8a'
    ctx.lineWidth = 2
    ctx.shadowColor = '#ff9b62'
    ctx.shadowBlur = 9
    ctx.beginPath(); ctx.moveTo(x - (i % 2 ? -20 : 20), y + 8); ctx.lineTo(x, y); ctx.stroke()
  }
  ctx.shadowBlur = 0
  for (const [i, x] of [210, 762].entries()) {
    const flash = Math.max(0, Math.sin(time * 0.95 + i * 3.2)) ** 22
    const radius = 55 + flash * 65
    const glow = ctx.createRadialGradient(x, 398, 0, x, 398, radius)
    glow.addColorStop(0, `rgba(255, 226, 145, ${flash * 0.6})`)
    glow.addColorStop(1, 'rgba(255, 128, 75, 0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = glow
    ctx.fillRect(x - radius, 398 - radius, radius * 2, radius * 2)
  }
  ctx.restore()
}

function background(ctx: CanvasRenderingContext2D, time: number, theme: Theme): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, theme === 'day' ? '#75bce9' : '#17234e')
  sky.addColorStop(0.58, theme === 'day' ? '#a9dcf4' : '#43528c')
  sky.addColorStop(1, theme === 'day' ? '#ffe1b0' : '#c77d9b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  const battleHaze = ctx.createLinearGradient(0, 300, 0, FIELD.wallY)
  battleHaze.addColorStop(0, '#ff845400')
  battleHaze.addColorStop(1, theme === 'day' ? '#ff9c5138' : '#ff694d57')
  ctx.fillStyle = battleHaze
  ctx.fillRect(0, 300, W, FIELD.wallY - 300)

  const glow = ctx.createRadialGradient(760, 145, 10, 760, 145, 440)
  glow.addColorStop(0, theme === 'day' ? '#fff4c388' : '#e9adcd44')
  glow.addColorStop(1, '#e9adcd00')
  ctx.fillStyle = glow
  ctx.fillRect(280, 0, 720, 520)
  const tealGlow = ctx.createRadialGradient(170, 360, 10, 170, 360, 320)
  tealGlow.addColorStop(0, '#7de3d12a')
  tealGlow.addColorStop(1, '#7de3d100')
  ctx.fillStyle = tealGlow
  ctx.fillRect(0, 50, 500, 500)

  ctx.fillStyle = theme === 'day' ? '#fff0ad' : '#fff9dd'
  ctx.shadowBlur = 38
  ctx.shadowColor = theme === 'day' ? '#fff3bd' : '#ffdbb0'
  ctx.beginPath()
  ctx.arc(806, 93, 31, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  if (theme === 'night') {
    ctx.fillStyle = '#e5edffb8'
    for (let i = 0; i < 25; i++) {
      const x = (i * 181 + 47) % 940 + 25
      const y = (i * 79 + 37) % 278 + 18
      ctx.beginPath()
      ctx.arc(x, y, (i % 4 === 0 ? 2 : 1.1) + Math.sin(time * 2 + i) * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  cloud(ctx, 118 + Math.sin(time * 0.12) * 18, 133, 1.1, theme)
  cloud(ctx, 535 + Math.sin(time * 0.09) * 13, 86, 0.78, theme)
  cloud(ctx, 895 + Math.sin(time * 0.13) * 15, 220, 0.7, theme)
  distantBattle(ctx, time, theme)

  ctx.fillStyle = theme === 'day' ? '#668fb2' : '#273b6a'
  ctx.beginPath()
  ctx.moveTo(0, 416)
  ctx.quadraticCurveTo(180, 324, 365, 421)
  ctx.quadraticCurveTo(548, 320, 755, 421)
  ctx.quadraticCurveTo(898, 348, 1000, 391)
  ctx.lineTo(W, FIELD.wallY)
  ctx.lineTo(0, FIELD.wallY)
  ctx.fill()

  ctx.fillStyle = theme === 'day' ? '#50799b' : '#1d3158'
  const towers = [[38, 373, 72, 142], [102, 406, 64, 109], [840, 401, 64, 114], [919, 358, 57, 157]]
  for (const [x, y, w, h] of towers) {
    ctx.fillRect(x, y, w, h)
    ctx.fillRect(x - 8, y, w + 16, 17)
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 7 + i * (w + 10) / 4, y - 10, 11, 13)
    ctx.fillStyle = '#efc17c80'
    ctx.fillRect(x + w / 2 - 4, y + 32, 8, 18)
    ctx.fillStyle = theme === 'day' ? '#50799b' : '#1d3158'
  }
  battlefieldFire(ctx, 95, FIELD.wallY + 7, time, 1.05, theme)
  battlefieldFire(ctx, 895, FIELD.wallY + 5, time + 1.9, 1.15, theme)
  battlefieldFire(ctx, 282, FIELD.wallY - 13, time + 3.5, 0.53, theme)
}

function wall(ctx: CanvasRenderingContext2D, lives: number, time: number): void {
  const top = FIELD.wallY
  ctx.fillStyle = '#624b64'
  ctx.fillRect(0, top + 16, W, H - top)
  ctx.fillStyle = '#8b6680'
  ctx.fillRect(0, top, W, 28)
  ctx.fillStyle = '#b18b86'
  for (let i = 0; i < 19; i++) {
    ctx.fillRect(i * 55, top - 15, 43, 23)
    ctx.fillStyle = '#c9a79a'
    ctx.fillRect(i * 55 + 3, top - 12, 37, 5)
    ctx.fillStyle = '#b18b86'
  }
  ctx.strokeStyle = '#4f405b'
  ctx.lineWidth = 3
  for (let row = 0; row < 2; row++) {
    const y = top + 30 + row * 35
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    for (let x = row ? 25 : 0; x < W; x += 84) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 35); ctx.stroke()
    }
  }
  if (lives < 3) {
    ctx.strokeStyle = '#3c354c'
    ctx.lineWidth = lives === 0 ? 7 : 4
    ctx.beginPath()
    ctx.moveTo(322, top + 9); ctx.lineTo(342, top + 31); ctx.lineTo(330, top + 49)
    ctx.lineTo(356, top + 65); ctx.lineTo(349, H)
    ctx.stroke()
  }
  if (lives < 2) {
    ctx.beginPath()
    ctx.moveTo(705, top - 8); ctx.lineTo(681, top + 21); ctx.lineTo(696, top + 47)
    ctx.lineTo(676, top + 68); ctx.lineTo(688, H)
    ctx.stroke()
    ctx.fillStyle = '#d8c7bf44'
    for (let i = 0; i < 6; i++) {
      const x = 662 + i * 19 + Math.sin(time * 1.3 + i) * 5
      const y = top - 8 - ((time * (12 + i * 3)) % 45)
      ctx.beginPath(); ctx.arc(x, y, 5 + i, 0, Math.PI * 2); ctx.fill()
    }
  }
}

function cannon(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  ctx.save()
  ctx.translate(FIELD.cannonX, FIELD.cannonY + (engine.recoil > 0 ? 7 : 0))
  ctx.rotate(engine.aimAngle)
  ctx.fillStyle = '#25324d'
  rounded(ctx, -15, -70, 30, 60, 10); ctx.fill()
  ctx.fillStyle = '#e1a66b'
  rounded(ctx, -11, -66, 22, 52, 7); ctx.fill()
  ctx.fillStyle = '#ffe0a1'
  rounded(ctx, -17, -77, 34, 15, 5); ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#22354c'
  ctx.beginPath(); ctx.ellipse(500, 522, 42, 20, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#eda66a'
  ctx.beginPath(); ctx.arc(500, 514, 20, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffe3a7'
  ctx.beginPath(); ctx.arc(500, 514, 9, 0, Math.PI * 2); ctx.fill()
}

function fallingWord(ctx: CanvasRenderingContext2D, engine: GameEngine, time: number): void {
  const word = engine.word
  if (!word || engine.state === 'WORD_DESTROYED' || engine.state === 'WALL_HIT') return
  const chars = [...word.word.toUpperCase()]
  const cell = chars.length > 8 ? 42 : 48
  const width = chars.length * cell + 30
  const x = engine.wordX - width / 2
  const y = engine.wordY
  const shaking = engine.wrongLetter && engine.feedbackTimer > 0
  ctx.save()
  ctx.translate(shaking ? Math.sin(time * 105) * 5 : 0, 0)
  ctx.shadowColor = '#080e25aa'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 13
  if (engine.state === 'WORD_REVEALED') {
    ctx.shadowColor = '#83f7c9'
    ctx.shadowBlur = 30
  }
  ctx.fillStyle = shaking ? '#ae535d' : engine.state === 'WORD_REVEALED' ? '#4caa91' : '#776087'
  rounded(ctx, x, y, width, 96, 16); ctx.fill()
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  ctx.fillStyle = shaking ? '#e8807f' : engine.state === 'WORD_REVEALED' ? '#89daba' : '#bd86a1'
  rounded(ctx, x + 5, y + 5, width - 10, 79, 12); ctx.fill()
  ctx.fillStyle = '#f8c89a'
  rounded(ctx, x + 10, y + 8, width - 20, 7, 3); ctx.fill()
  ctx.fillStyle = '#5c456d'
  for (const rx of [x + 12, x + width - 12]) {
    ctx.beginPath(); ctx.arc(rx, y + 46, 4, 0, Math.PI * 2); ctx.fill()
  }
  for (let i = 0; i < chars.length; i++) {
    const cx = x + 15 + i * cell
    const correct = i < engine.letterIndex
    const wrong = i === engine.letterIndex && shaking
    ctx.fillStyle = correct ? '#54dba7' : wrong ? '#ff6878' : '#f7e9df'
    rounded(ctx, cx, y + 27, cell - 5, 44, 8); ctx.fill()
    if (engine.state === 'PLAYING' && i === engine.letterIndex) {
      ctx.strokeStyle = '#fff4aa'
      ctx.lineWidth = 3
      ctx.shadowColor = '#ffcc70'
      ctx.shadowBlur = 14
      rounded(ctx, cx + 1, y + 28, cell - 7, 42, 7); ctx.stroke()
      ctx.shadowBlur = 0
    }
    ctx.fillStyle = correct ? '#174d51' : wrong ? '#712d4c' : '#354363'
    ctx.font = '800 26px "Baloo 2", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(correct ? chars[i] : wrong ? engine.wrongLetter : '', cx + (cell - 5) / 2, y + 50)
    if (!correct && !wrong) {
      ctx.fillStyle = '#8590aa'
      ctx.fillRect(cx + 11, y + 60, cell - 27, 2)
    }
  }
  ctx.restore()
}

function explodingWord(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  if ((engine.state !== 'WORD_DESTROYED' && engine.state !== 'WALL_HIT') || !engine.word) return
  const missed = engine.state === 'WALL_HIT'
  const duration = missed ? engine.lives === 0 ? FINAL_WALL_HIT_DURATION : WALL_HIT_DURATION : EXPLOSION_DURATION
  const progress = Math.max(0, Math.min(1, 1 - engine.transitionTimer / duration))
  const travel = 1 - (1 - progress) ** 3
  const cx = engine.wordX
  const cy = missed ? FIELD.wallY - 12 : engine.wordY + 48

  ctx.save()
  const radius = 95 + progress * 150
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  glow.addColorStop(0, missed ? '#ffe3c7' : '#fff8c9')
  glow.addColorStop(0.28, missed ? '#ff8b78bb' : '#ffc978bb')
  glow.addColorStop(0.7, missed ? '#d9577844' : '#ff916244')
  glow.addColorStop(1, missed ? '#d9577800' : '#ff916200')
  ctx.globalAlpha = Math.max(0, 1 - progress * 0.9)
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill()

  for (const delay of [0, 0.12]) {
    const ring = (progress - delay) / (1 - delay)
    if (ring < 0 || ring > 1) continue
    ctx.globalAlpha = (1 - ring) * (delay ? 0.55 : 0.9)
    ctx.strokeStyle = missed ? delay ? '#ffc199' : '#ff7188' : delay ? '#8af1d3' : '#fff1b8'
    ctx.lineWidth = 3 + (1 - ring) * 11
    ctx.beginPath(); ctx.arc(cx, cy, 28 + ring * 205, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.globalAlpha = Math.max(0, (1 - progress) ** 2 * 0.65)
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6
    const inner = 27 + progress * 30
    const outer = 88 + travel * 135
    const spread = 0.12 * (1 - progress)
    ctx.fillStyle = missed ? i % 2 ? '#ffe2bb' : '#ff8190' : i % 2 ? '#fff5cb' : '#ffd085'
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle - spread) * inner, cy + Math.sin(angle - spread) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.lineTo(cx + Math.cos(angle + spread) * inner, cy + Math.sin(angle + spread) * inner)
    ctx.closePath(); ctx.fill()
  }

  const shardColors = missed ? ['#ef8294', '#855f88', '#f8c79c', '#ffc58f', '#fff0c1'] : ['#c688a5', '#855f88', '#f8c79c', '#85dec1', '#fff0c1']
  ctx.globalAlpha = Math.max(0, 1 - progress * 0.85)
  for (let i = 0; i < 18; i++) {
    const angle = i * 2.4
    const distance = (75 + i % 4 * 22) * travel
    ctx.save()
    ctx.translate(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance + progress * progress * 90)
    ctx.rotate(angle + progress * (i % 2 ? 4 : -4))
    ctx.fillStyle = shardColors[i % shardColors.length]
    const size = 8 + i % 4 * 5
    ctx.beginPath(); ctx.moveTo(-size, -size / 2); ctx.lineTo(size, -size / 3)
    ctx.lineTo(size / 2, size); ctx.lineTo(-size / 2, size / 2); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  const chars = [...engine.word.word.toUpperCase()]
  const cell = chars.length > 8 ? 42 : 48
  const width = chars.length * cell + 30
  ctx.globalAlpha = Math.min(1, Math.max(0, (1 - progress) / 0.55))
  for (let i = 0; i < chars.length; i++) {
    const x = cx - width / 2 + 15 + i * cell + (cell - 5) / 2
    const dx = (i - (chars.length - 1) / 2) * 31 + (i % 2 ? 27 : -27)
    const y = cy - (110 + i % 3 * 28) * travel + 165 * progress * progress
    ctx.save()
    ctx.translate(x + dx * travel, y)
    ctx.rotate((i % 2 ? 1 : -1) * (0.8 + i % 4 * 0.25) * progress)
    ctx.fillStyle = missed ? '#ffb582' : '#65dbaa'
    rounded(ctx, -(cell - 5) / 2, -22, cell - 5, 44, 8); ctx.fill()
    ctx.fillStyle = missed ? '#6e3551' : '#174d51'
    ctx.font = '800 26px "Baloo 2", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(chars[i], 0, 1)
    ctx.restore()
  }

  ctx.globalAlpha = Math.max(0, 1 - progress * 5)
  ctx.fillStyle = '#fffdf1'
  ctx.shadowColor = missed ? '#ff7890' : '#fff0b4'; ctx.shadowBlur = 35
  ctx.beginPath(); ctx.arc(cx, cy, 28 + progress * 75, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

export function renderGame(ctx: CanvasRenderingContext2D, engine: GameEngine, time: number, theme: Theme = 'night', reducedMotion = false): void {
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  if (!reducedMotion && engine.shake > 0) ctx.translate((Math.random() - 0.5) * engine.shake * 13, (Math.random() - 0.5) * engine.shake * 11)
  background(ctx, time, theme)
  ctx.fillStyle = '#efc39b44'
  ctx.fillRect(0, FIELD.wallY - 1, W, 2)
  fallingWord(ctx, engine, time)
  wall(ctx, engine.lives, time)
  cannon(ctx, engine)
  if (engine.muzzleFlash > 0 && !reducedMotion) {
    ctx.fillStyle = `rgba(255, 232, 158, ${engine.muzzleFlash / 0.09})`
    ctx.beginPath()
    ctx.arc(FIELD.cannonX + Math.sin(engine.aimAngle) * 76, FIELD.cannonY - Math.cos(engine.aimAngle) * 76, 15, 0, Math.PI * 2)
    ctx.fill()
  }
  if (engine.bullet) {
    const b = engine.bullet
    ctx.strokeStyle = '#ffe59a9c'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(b.x + (FIELD.cannonX - b.x) * 0.08, b.y + (FIELD.cannonY - b.y) * 0.08)
    ctx.stroke()
    ctx.shadowColor = '#fff3a8'
    ctx.shadowBlur = 24
    ctx.fillStyle = '#fff2a1'
    ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#643e54'
    ctx.font = '800 14px Nunito, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(b.character, b.x, b.y + 1)
  }
  for (const p of reducedMotion ? [] : engine.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const item of engine.feedback) {
    ctx.globalAlpha = reducedMotion ? 1 : Math.max(0, item.life / item.maxLife)
    ctx.fillStyle = item.color
    ctx.font = '800 26px "Baloo 2", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(item.text, item.x, item.y)
  }
  ctx.globalAlpha = 1
  if (engine.state === 'WORD_DESTROYED' || engine.state === 'WALL_HIT') {
    explodingWord(ctx, engine)
  }
  if (engine.state === 'WORD_DESTROYED') {
    ctx.fillStyle = '#fff0bb'
    ctx.shadowColor = '#ffaf72'; ctx.shadowBlur = 20
    ctx.font = '800 44px "Baloo 2", sans-serif'
    ctx.textAlign = 'center'
    const latest = engine.wordResults.at(-1)
    ctx.fillText(`+${latest?.score ?? engine.config.baseScore}`, engine.wordX, engine.wordY + 35 - (EXPLOSION_DURATION - engine.transitionTimer) * 38)
    ctx.shadowBlur = 0
  }
  ctx.restore()
}
