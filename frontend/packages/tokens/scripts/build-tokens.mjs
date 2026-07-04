import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(packageRoot, 'src')
const distDir = path.join(packageRoot, 'dist')

const primitiveDir = path.join(srcDir, 'primitive')
const semanticLightDir = path.join(srcDir, 'semantic/light')
const semanticDarkDir = path.join(srcDir, 'semantic/dark')
const componentDir = path.join(srcDir, 'component')

async function readJsonFiles(dir) {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return readJsonFiles(entryPath)
      }

      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        return []
      }

      const content = await readFile(entryPath, 'utf8')
      return [JSON.parse(content)]
    }),
  )

  return files.flat()
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isToken(value) {
  return isRecord(value) && '$value' in value
}

function clone(value) {
  if (!isRecord(value)) {
    return value
  }

  return JSON.parse(JSON.stringify(value))
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isRecord(value) && isRecord(target[key]) && !isToken(value) && !isToken(target[key])) {
      deepMerge(target[key], value)
      continue
    }

    target[key] = clone(value)
  }

  return target
}

async function readTokenSet(dir) {
  const files = await readJsonFiles(dir)
  return files.reduce((result, file) => deepMerge(result, file), {})
}

function collectTokens(node, pathParts = [], result = []) {
  if (isToken(node)) {
    result.push({
      path: pathParts,
      name: pathParts.join('.'),
      type: node.$type,
      rawValue: node.$value,
    })
    return result
  }

  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) {
      collectTokens(value, [...pathParts, key], result)
    }
  }

  return result
}

function getTokenByPath(root, tokenPath) {
  return tokenPath.split('.').reduce((current, segment) => current?.[segment], root)
}

function resolveValue(value, tokenRoot, stack = []) {
  if (typeof value !== 'string') {
    return value
  }

  const exactReference = value.match(/^\{([^}]+)\}$/)
  if (exactReference) {
    return resolveReference(exactReference[1], tokenRoot, stack)
  }

  return value.replaceAll(/\{([^}]+)\}/g, (_match, tokenPath) => String(resolveReference(tokenPath, tokenRoot, stack)))
}

function resolveReference(tokenPath, tokenRoot, stack) {
  if (stack.includes(tokenPath)) {
    throw new Error(`Circular token reference: ${[...stack, tokenPath].join(' -> ')}`)
  }

  const token = getTokenByPath(tokenRoot, tokenPath)

  if (!isToken(token)) {
    throw new Error(`Unknown token reference: ${tokenPath}`)
  }

  return resolveValue(token.$value, tokenRoot, [...stack, tokenPath])
}

function resolveTokens(tokenRoot) {
  const tokens = collectTokens(tokenRoot)

  return tokens.map((token) => ({
    ...token,
    value: resolveValue(token.rawValue, tokenRoot, [token.name]),
  }))
}

function toCssVariableName(tokenPath) {
  return `--chart-${tokenPath.join('-').replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}

function formatCssValue(value) {
  return String(value)
}

function toCssDeclaration(token) {
  return `  ${toCssVariableName(token.path)}: ${formatCssValue(token.value)};`
}

function toCssBlock(selector, tokens) {
  return `${selector} {\n${tokens.map(toCssDeclaration).join('\n')}\n}\n`
}

function cloneResolvedTree(node, tokenRoot) {
  if (isToken(node)) {
    return resolveValue(node.$value, tokenRoot, [])
  }

  const result = {}

  for (const [key, value] of Object.entries(node)) {
    if (isRecord(value)) {
      result[key] = cloneResolvedTree(value, tokenRoot)
    }
  }

  return result
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function writeModule(name, value) {
  await writeFile(path.join(distDir, 'js', `${name}.js`), `export default ${stableJson(value)}export const ${name}Tokens = ${stableJson(value)}`)
  await writeFile(
    path.join(distDir, 'types', `${name}.d.ts`),
    `declare const ${name}Tokens: ${stableJson(value)}export default ${name}Tokens\nexport { ${name}Tokens }\n`,
  )
}

async function main() {
  const primitive = await readTokenSet(primitiveDir)
  const semanticLight = await readTokenSet(semanticLightDir)
  const semanticDark = await readTokenSet(semanticDarkDir)
  const component = await readTokenSet(componentDir)

  const lightSource = deepMerge(deepMerge(deepMerge({}, primitive), semanticLight), component)
  const darkSource = deepMerge(deepMerge(deepMerge({}, primitive), semanticDark), component)

  const primitiveTokens = resolveTokens(primitive)
  const lightTokens = resolveTokens(lightSource)
  const darkTokens = resolveTokens(darkSource)

  const resolvedPrimitive = cloneResolvedTree(primitive, primitive)
  const resolvedLightSemantic = cloneResolvedTree(semanticLight, lightSource)
  const resolvedDarkSemantic = cloneResolvedTree(semanticDark, darkSource)
  const resolvedLightComponent = cloneResolvedTree(component, lightSource)
  const resolvedDarkComponent = cloneResolvedTree(component, darkSource)
  const resolvedLight = cloneResolvedTree(lightSource, lightSource)
  const resolvedDark = cloneResolvedTree(darkSource, darkSource)

  await rm(distDir, { recursive: true, force: true })
  await mkdir(path.join(distDir, 'css'), { recursive: true })
  await mkdir(path.join(distDir, 'js'), { recursive: true })
  await mkdir(path.join(distDir, 'types'), { recursive: true })

  const primitiveCss = toCssBlock(':root', primitiveTokens)
  const lightCss = toCssBlock(":root,\n[data-theme='light']", lightTokens)
  const darkCss = toCssBlock("[data-theme='dark']", darkTokens)

  await writeFile(path.join(distDir, 'css/tokens.css'), `${lightCss}\n${darkCss}`)
  await writeFile(path.join(distDir, 'css/light.css'), `${primitiveCss}\n${lightCss}`)
  await writeFile(path.join(distDir, 'css/dark.css'), `${primitiveCss}\n${darkCss}`)
  await writeFile(path.join(distDir, 'css/themes.css'), `${lightCss}\n${darkCss}`)

  await writeModule('primitive', resolvedPrimitive)
  await writeModule('semantic', {
    light: resolvedLightSemantic,
    dark: resolvedDarkSemantic,
  })
  await writeModule('component', {
    light: resolvedLightComponent,
    dark: resolvedDarkComponent,
  })

  await writeFile(
    path.join(distDir, 'js/index.js'),
    [
      `export const primitiveTokens = ${stableJson(resolvedPrimitive)}`,
      `export const semanticTokens = ${stableJson({ light: resolvedLightSemantic, dark: resolvedDarkSemantic })}`,
      `export const componentTokens = ${stableJson({ light: resolvedLightComponent, dark: resolvedDarkComponent })}`,
      `export const tokens = ${stableJson(resolvedLight)}`,
      `export const themes = ${stableJson({ light: resolvedLight, dark: resolvedDark })}`,
      'export default tokens',
      '',
    ].join('\n'),
  )

  await writeFile(
    path.join(distDir, 'types/index.d.ts'),
    [
      `export declare const primitiveTokens: ${stableJson(resolvedPrimitive)}`,
      `export declare const semanticTokens: ${stableJson({ light: resolvedLightSemantic, dark: resolvedDarkSemantic })}`,
      `export declare const componentTokens: ${stableJson({ light: resolvedLightComponent, dark: resolvedDarkComponent })}`,
      `export declare const tokens: ${stableJson(resolvedLight)}`,
      `export declare const themes: ${stableJson({ light: resolvedLight, dark: resolvedDark })}`,
      'export type TokenName = string',
      'export type TokenValue = string | number',
      'export default tokens',
      '',
    ].join('\n'),
  )

  console.log(`Built ${lightTokens.length} light tokens and ${darkTokens.length} dark tokens.`)
}

await main()
