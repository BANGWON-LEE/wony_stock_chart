import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const css = await readFile(new URL('../index.css', import.meta.url), 'utf8')

test('maps chart design token variables into Tailwind theme variables', () => {
  assert.match(css, /@import\s+["']tailwindcss["'];/)
  assert.match(css, /@theme\s*{/)

  for (const declaration of [
    '--color-chart-canvas: var(--chart-color-background-canvas);',
    '--color-chart-text-primary: var(--chart-color-text-primary);',
    '--color-chart-card-elevated: var(--chart-card-elevated-background);',
    '--spacing-chart-4: var(--chart-spacing-4);',
    '--radius-chart-card: var(--chart-card-radius);',
    '--shadow-chart-elevated: var(--chart-card-elevated-shadow);',
  ]) {
    assert.ok(css.includes(declaration), `Missing Tailwind token declaration: ${declaration}`)
  }
})
