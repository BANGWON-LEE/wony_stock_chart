# Design Tokens Package Design

Date: 2026-06-24

## Goal

이 프로젝트의 UI 퍼블리싱과 디자인 컴포넌트 라이브러리화를 시작하기 전에, 재사용 가능한 디자인 토큰 기반을 먼저 구성한다.

토큰은 JSON을 원천 데이터로 두고, 빌드 결과물로 CSS 변수와 TypeScript 객체/타입을 생성한다. 초기 범위는 light/dark theme, primitive/semantic/component 계층, 그리고 Button/Input/Card 컴포넌트 토큰이다.

## Decisions

- Package manager: `pnpm`
- Repository shape: pnpm workspace monorepo
- Token source: JSON
- Generated outputs: CSS variables and TypeScript exports
- Theme scope: light and dark
- Token hierarchy: Primitive → Semantic → Component
- Initial component token scope: Button, Input, Card
- Visual companion material: not used

## Target Workspace Structure

```txt
frontend/
├─ apps/
│  └─ web/
│     └─ current Vite React app
├─ packages/
│  └─ tokens/
│     ├─ src/
│     │  ├─ primitive/
│     │  ├─ semantic/
│     │  │  ├─ light/
│     │  │  └─ dark/
│     │  └─ component/
│     │     ├─ button/
│     │     ├─ input/
│     │     └─ card/
│     ├─ scripts/
│     ├─ dist/
│     │  ├─ css/
│     │  ├─ js/
│     │  └─ types/
│     └─ package.json
├─ pnpm-workspace.yaml
└─ package.json
```

The current Vite app should move into `apps/web` when the monorepo conversion is implemented. The reusable token package should live at `packages/tokens`.

## Token Layering Rules

### Primitive tokens

Primitive tokens are raw design values. They do not reference semantic or component tokens.

Initial categories:

- `color`
- `typography`
- `spacing`
- `radius`
- `borderWidth`
- `shadow`
- `opacity`
- `zIndex`
- `duration`
- `easing`

Example:

```json
{
  "color": {
    "neutral": {
      "950": {
        "$type": "color",
        "$value": "#0f172a"
      }
    }
  }
}
```

### Semantic tokens

Semantic tokens express UI meaning and may reference primitive tokens. They are theme-aware.

Initial categories:

- `color.background`
- `color.surface`
- `color.text`
- `color.border`
- `color.icon`
- `color.action`
- `color.status`
- `color.chart`
- `typography`
- `spacing`
- `radius`
- `shadow`
- `focus`

Example:

```json
{
  "color": {
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.neutral.950}"
      }
    }
  }
}
```

### Component tokens

Component tokens define component-specific values and should reference semantic tokens where possible. Component tokens should not reference primitive tokens directly unless there is a deliberate exception.

Initial component token groups:

- `button`
- `input`
- `card`

Initial component variants:

- `button`: `primary`, `secondary`, `ghost`, `danger`
- `input`: `default`, `filled`, `error`, `disabled`
- `card`: `default`, `elevated`, `outlined`

Initial component states:

- `default`
- `hover`
- `active`
- `focus`
- `disabled`
- `selected`
- `error`
- `success`
- `warning`

Example:

```json
{
  "button": {
    "primary": {
      "background": {
        "default": {
          "$type": "color",
          "$value": "{color.action.primary.background.default}"
        }
      }
    }
  }
}
```

## Naming Rules

Token path naming:

```txt
Primitive: color.neutral.950
Semantic: color.text.primary
Component: button.primary.background.default
```

CSS variable naming:

```txt
--chart-color-text-primary
--chart-button-primary-background-default
```

TypeScript export shape:

```ts
tokens.color.text.primary
tokens.button.primary.background.default
```

Naming constraints:

- Token paths use lower camel case for compound words, such as `borderWidth`.
- Numeric scales are allowed for primitives, such as `50`, `100`, `950`.
- Semantic names should describe purpose, not raw color names.
- Component tokens should include component, variant, property, and state where state matters.
- CSS variable names use the `--chart-` prefix.

## Theme Model

Theme application should use a `data-theme` attribute:

```html
<html data-theme="light">
```

Generated CSS should support:

```css
:root,
[data-theme='light'] {
  --chart-color-text-primary: ...;
}

[data-theme='dark'] {
  --chart-color-text-primary: ...;
}
```

Light should be the default theme.

## Package API

CSS entrypoints:

```txt
@chart/tokens/css
@chart/tokens/css/light
@chart/tokens/css/dark
@chart/tokens/css/themes
```

TypeScript entrypoints:

```txt
@chart/tokens
@chart/tokens/primitive
@chart/tokens/semantic
@chart/tokens/component
```

Expected TypeScript exports:

```ts
export const tokens
export const primitiveTokens
export const semanticTokens
export const componentTokens
export type TokenName
export type TokenValue
```

## Initial Build Tooling Direction

Use a token build step that can:

- Read DTCG-style JSON token files using `$type` and `$value`.
- Resolve token references such as `{color.neutral.950}`.
- Generate CSS custom properties.
- Generate TypeScript objects and declaration files.
- Keep generated files out of source authoring paths.

Style Dictionary is the preferred build tool for this initial implementation because it directly fits JSON token source files, transform pipelines, and multi-format output.

## Migration Notes

The existing `src/index.css` already contains project-level CSS variables such as `--text`, `--bg`, `--border`, and `--accent`. During implementation, these should be replaced by generated token CSS variables rather than manually maintained in the app.

The current app styles should consume generated variables from `@chart/tokens/css` after the workspace and package are created.

## Non-goals For Initial Token Pass

- Full UI component implementation
- Visual regression setup
- Storybook setup
- Figma token sync
- Design token publishing to npm
- Browser-based visual documentation

## Open Implementation Checks

- Confirm whether the workspace root should remain `frontend` or move one level up later.
- Confirm package name `@chart/tokens` is acceptable before implementation.
- Confirm whether generated `dist` files should be committed or ignored.

