// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
// @ts-expect-error Browser build omits Node types; Vitest provides the Node runtime.
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import Snowfall from './Snowfall'

const atmosphereCss = readFileSync('src/atmosphere.css', 'utf8')

function luminance(channels: number[]): number {
  const [red, green, blue] = channels.map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  document.head.innerHTML = ''
})

it('keeps tiny snow visible against the day background', () => {
  document.head.innerHTML = `<style>${atmosphereCss}</style>`
  document.documentElement.dataset.theme = 'day'
  const { container } = render(<Snowfall />)
  const flake = container.querySelector<HTMLElement>('.snowflake')!
  const style = getComputedStyle(flake)
  expect(style.display).not.toBe('none')
  expect(getComputedStyle(container.firstElementChild!).zIndex).toBe('1')
  const channels = style.backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number)
  const opacity = Number(style.opacity)
  const dayBackground = [233, 246, 255] // theme.css day page background
  const visibleColor = channels.map((channel, index) => channel * opacity + dayBackground[index] * (1 - opacity))
  const light = luminance(dayBackground)
  const dark = luminance(visibleColor)
  expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(2)
})
