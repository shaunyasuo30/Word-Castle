import { FIELD } from './config'
import type { Theme } from '../theme'

function paint(ctx: CanvasRenderingContext2D, fill: string, outline = '#193850'): void {
  ctx.fillStyle = fill
  ctx.strokeStyle = outline
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()
}

function dragonFire(ctx: CanvasRenderingContext2D, time: number, strength: number): void {
  const length = 110 + Math.sin(time * 19) * 16
  const height = 18 + Math.sin(time * 25) * 4
  const glow = ctx.createRadialGradient(108, -3, 4, 150, -3, length)
  glow.addColorStop(0, `rgba(255, 219, 112, ${strength * 0.45})`)
  glow.addColorStop(1, 'rgba(255, 111, 58, 0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(150, -3, length, 0, Math.PI * 2); ctx.fill()

  ctx.globalAlpha = strength
  const flame = ctx.createLinearGradient(82, 0, 82 + length, 0)
  flame.addColorStop(0, '#ffdb75')
  flame.addColorStop(0.52, '#ff9145')
  flame.addColorStop(1, '#e94e43')
  ctx.fillStyle = flame
  ctx.beginPath()
  ctx.moveTo(79, -6)
  ctx.quadraticCurveTo(112, -height, 136, -height * 0.7)
  ctx.quadraticCurveTo(153, -height * 1.4, 166, -height * 0.35)
  ctx.lineTo(82 + length, -3)
  ctx.quadraticCurveTo(165, height * 0.65, 140, height * 0.55)
  ctx.quadraticCurveTo(113, height * 1.2, 79, 4)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fff0aa'
  ctx.beginPath()
  ctx.moveTo(85, -3)
  ctx.quadraticCurveTo(127, -height * 0.5, 151, -3)
  ctx.lineTo(114 + length * 0.45, -2)
  ctx.quadraticCurveTo(123, height * 0.35, 85, 2)
  ctx.closePath()
  ctx.fill()

  for (let i = 0; i < 5; i++) {
    const offset = (time * 90 + i * 39) % length
    ctx.globalAlpha = strength * (1 - offset / length)
    ctx.fillStyle = i % 2 ? '#ffce76' : '#ff874c'
    ctx.beginPath()
    ctx.arc(97 + offset, Math.sin(time * 7 + i * 2) * 13, 2 + i % 2 * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Decorative canvas character. The game engine never uses its position for collisions. */
export function drawDragon(ctx: CanvasRenderingContext2D, time: number, theme: Theme, reducedMotion: boolean): void {
  const travel = reducedMotion ? 0 : time * 0.32
  const x = FIELD.width / 2 - 430 * Math.cos(travel)
  const y = 300 + (reducedMotion ? 0 : Math.sin(time * 1.5) * 16)
  const direction = Math.sin(travel) >= 0 ? 1 : -1
  const wingLift = reducedMotion ? 10 : Math.sin(time * 8.5) * 27
  const breath = reducedMotion ? 2 : (time + 1.5) % 6
  const fireStrength = breath < 1.5 ? Math.min(1, breath * 4, (1.5 - breath) * 4) : 0
  const body = theme === 'day' ? '#368e87' : '#347c91'
  const wing = theme === 'day' ? '#57afa4' : '#538eac'
  const shade = theme === 'day' ? '#267476' : '#286076'

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(direction * 0.88, 0.88)
  ctx.shadowColor = '#13274466'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 7

  // Tail, far wing, feet and flame sit behind the body.
  ctx.strokeStyle = '#193850'
  ctx.lineWidth = 25
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-63, 6)
  ctx.bezierCurveTo(-102, 1, -108, 32, -148, 18)
  ctx.stroke()
  ctx.strokeStyle = shade
  ctx.lineWidth = 17
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-157, 5); ctx.lineTo(-143, 17); ctx.lineTo(-162, 27); ctx.closePath()
  paint(ctx, '#73c2ae')

  ctx.beginPath()
  ctx.moveTo(-38, -18)
  ctx.quadraticCurveTo(-76, -85 - wingLift * 0.5, -114, -88 - wingLift)
  ctx.lineTo(-93, -35 - wingLift * 0.45)
  ctx.lineTo(-65, -47 - wingLift * 0.35)
  ctx.lineTo(-47, -7)
  ctx.closePath()
  paint(ctx, shade)

  for (const footX of [-36, 22]) {
    ctx.beginPath()
    ctx.moveTo(footX - 9, 18)
    ctx.quadraticCurveTo(footX - 14, 45, footX + 10, 47)
    ctx.lineTo(footX + 18, 39)
    ctx.quadraticCurveTo(footX + 4, 38, footX + 8, 19)
    ctx.closePath()
    paint(ctx, shade)
    ctx.fillStyle = '#e3d8aa'
    for (let claw = 0; claw < 2; claw++) {
      ctx.beginPath()
      ctx.moveTo(footX + 10 + claw * 7, 43)
      ctx.lineTo(footX + 17 + claw * 7, 44)
      ctx.lineTo(footX + 10 + claw * 7, 50)
      ctx.closePath(); ctx.fill()
    }
  }

  if (fireStrength > 0) dragonFire(ctx, time, fireStrength)

  ctx.beginPath()
  ctx.moveTo(-72, -8)
  ctx.bezierCurveTo(-66, -43, -17, -49, 22, -33)
  ctx.quadraticCurveTo(55, -24, 58, 1)
  ctx.bezierCurveTo(48, 33, -18, 42, -57, 25)
  ctx.quadraticCurveTo(-76, 15, -72, -8)
  ctx.closePath()
  paint(ctx, body)

  ctx.fillStyle = '#9dd2ae'
  ctx.beginPath()
  ctx.moveTo(-42, 16)
  ctx.quadraticCurveTo(4, 42, 46, 12)
  ctx.quadraticCurveTo(15, 30, -42, 16)
  ctx.fill()

  // The front wing flaps around the shoulder without covering the head.
  ctx.beginPath()
  ctx.moveTo(-21, -25)
  ctx.quadraticCurveTo(-38, -82 - wingLift, -84, -107 - wingLift)
  ctx.lineTo(-75, -40 - wingLift * 0.45)
  ctx.lineTo(-53, -51 - wingLift * 0.55)
  ctx.lineTo(-31, -29 - wingLift * 0.22)
  ctx.closePath()
  paint(ctx, wing)
  ctx.strokeStyle = '#b3dacc88'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-24, -24)
  ctx.quadraticCurveTo(-49, -58 - wingLift * 0.7, -84, -107 - wingLift)
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    const spikeX = -55 + i * 23
    ctx.beginPath()
    ctx.moveTo(spikeX - 9, -35)
    ctx.lineTo(spikeX, -51 - (i % 2) * 5)
    ctx.lineTo(spikeX + 10, -35)
    ctx.closePath()
    paint(ctx, '#9ed7ba')
  }

  ctx.beginPath()
  ctx.moveTo(28, -26)
  ctx.quadraticCurveTo(56, -52, 82, -35)
  ctx.lineTo(101, -20)
  ctx.quadraticCurveTo(109, -11, 94, -7)
  ctx.lineTo(79, 0)
  ctx.quadraticCurveTo(59, 7, 44, -7)
  ctx.closePath()
  paint(ctx, body)

  ctx.beginPath()
  ctx.moveTo(49, -43); ctx.lineTo(58, -65); ctx.lineTo(66, -39); ctx.closePath()
  paint(ctx, '#e9d8ad')
  ctx.beginPath()
  ctx.moveTo(66, -39); ctx.lineTo(78, -57); ctx.lineTo(79, -31); ctx.closePath()
  paint(ctx, '#e9d8ad')

  ctx.fillStyle = '#fff2b1'
  ctx.beginPath(); ctx.ellipse(76, -23, 6, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#253853'
  ctx.beginPath(); ctx.ellipse(78, -22, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#193850'
  ctx.beginPath(); ctx.arc(94, -17, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#193850'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(77, -3); ctx.quadraticCurveTo(91, 2, 101, -8); ctx.stroke()
  ctx.restore()
}
