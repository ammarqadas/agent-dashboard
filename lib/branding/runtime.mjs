// Portable Node runtime; keep in sync with dadih-server/src/lib/branding/runtime.mjs.
// No build-time reads: BRAND_DIRECTORY is resolved on every request.
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const light = {
  primary: '#147B77', onPrimary: '#FFFFFF', accent: '#D4AC11', onAccent: '#FFFFFF',
  background: '#F8F7F6', surface: '#FFFFFF', text: '#1D2930', mutedText: '#627B84',
  border: '#E5E2DC', focusRing: '#147B77', gradientStart: '#147B77', gradientEnd: '#1DA2AF',
}
const dark = {
  primary: '#1DAFA9', onPrimary: '#132026', accent: '#8F7724', onAccent: '#FFFFFF',
  background: '#131C20', surface: '#172226', text: '#F4F3F1', mutedText: '#8C9FA6',
  border: '#29363D', focusRing: '#1DAFA9', gradientStart: '#154C49', gradientEnd: '#173747',
}
export const defaultBrand = {
  schemaVersion: 1,
  brandKey: 'shumul',
  name: { ar: 'شمول كاش', en: 'Shumul Cash' },
  description: { ar: 'لوحة تحكم الوكلاء - إدارة المحافظ والمعاملات', en: 'Wallet management' },
  assets: { logo: '', darkLogo: '', favicon: '' },
  theme: { light, dark, typography: { fontFile: '', baseFontSize: '15px' }, shape: { controlRadius: '10px', cardRadius: '16px' } },
  support: { phone: '+967 778 825 844', email: '', website: '' },
  legal: { companyName: 'شمول كاش' },
  messaging: { defaultSmsSenderName: 'شمول كاش' },
  customCss: false,
  configured: false,
  revision: 'default',
}
const lastGood = new Map()
const failures = new Map()
const hash = (value) => createHash('sha256').update(value).digest('hex')
const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
function text(value, fallback, max = 300) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid branding text')
  return value
}
function asset(value = '') {
  if (typeof value !== 'string' || (value && !/^[\w-]+(?:\/[\w-]+)*\.(png|jpg|jpeg|webp|gif|ico|woff2?)$/i.test(value))) {
    throw new Error('Invalid branding asset filename')
  }
  return value
}
function palette(value, fallback) {
  if (value === undefined) return fallback
  if (!object(value)) throw new Error('Invalid branding palette')
  return Object.fromEntries(Object.entries(fallback).map(([key, color]) => {
    const next = value[key] ?? color
    if (typeof next !== 'string' || !/^#[\da-f]{6}$/i.test(next)) throw new Error(`Invalid theme color: ${key}`)
    return [key, next]
  }))
}
function size(value, fallback, min, max) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?px$/.test(value) || parseFloat(value) < min || parseFloat(value) > max) throw new Error('Invalid theme size')
  return value
}
export function validateBrand(input) {
  if (!object(input) || input.schemaVersion !== 1 || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(input.brandKey ?? '')) throw new Error('Invalid brand schemaVersion or brandKey')
  for (const key of ['name', 'description', 'assets', 'theme', 'support', 'legal', 'messaging']) {
    if (input[key] !== undefined && !object(input[key])) throw new Error(`Invalid brand section: ${key}`)
  }
  if (!input.name?.ar?.trim() || !input.name?.en?.trim()) throw new Error('Both brand names are required')
  if (input.customCss !== undefined && typeof input.customCss !== 'boolean') throw new Error('customCss must be boolean')
  const theme = input.theme ?? {}
  for (const key of ['typography', 'shape']) if (theme[key] !== undefined && !object(theme[key])) throw new Error(`Invalid theme ${key}`)
  const assets = { logo: asset(input.assets?.logo), darkLogo: asset(input.assets?.darkLogo), favicon: asset(input.assets?.favicon) }
  for (const file of Object.values(assets)) if (file && !/\.(png|jpe?g|webp|gif|ico)$/i.test(file)) throw new Error('Logo/favicon must be an image')
  const fontFile = asset(theme.typography?.fontFile)
  if (fontFile && !/\.woff2?$/i.test(fontFile)) throw new Error('Font must be WOFF/WOFF2')
  const name = { ar: text(input.name.ar, ''), en: text(input.name.en, '') }
  return {
    ...defaultBrand, brandKey: input.brandKey, name, assets,
    description: { ar: text(input.description?.ar, `${name.ar} - إدارة المحافظ والمعاملات`), en: text(input.description?.en, `${name.en} wallet management`) },
    theme: {
      light: palette(theme.light, light), dark: palette(theme.dark, dark),
      typography: { fontFile, baseFontSize: size(theme.typography?.baseFontSize, '15px', 12, 24) },
      shape: { controlRadius: size(theme.shape?.controlRadius, '10px', 0, 40), cardRadius: size(theme.shape?.cardRadius, '16px', 0, 64) },
    },
    support: { phone: text(input.support?.phone, ''), email: text(input.support?.email, ''), website: text(input.support?.website, '') },
    legal: { companyName: text(input.legal?.companyName, name.ar) },
    messaging: { defaultSmsSenderName: text(input.messaging?.defaultSmsSenderName, name.ar) },
    customCss: input.customCss === true, configured: true, revision: hash(JSON.stringify(input)).slice(0, 16),
  }
}
export async function getBrand() {
  const directory = process.env.BRAND_DIRECTORY
  if (!directory) return defaultBrand
  try {
    const filename = path.join(directory, 'brand.json')
    if ((await stat(filename)).size > 65536) throw new Error('brand.json exceeds 64 KiB')
    const brand = validateBrand(JSON.parse(await readFile(filename, 'utf8')))
    lastGood.set(directory, brand)
    failures.delete(directory)
    return brand
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (failures.get(directory) !== message) console.error(`[branding] ${message}; using last valid profile or defaults`)
    failures.set(directory, message)
    return lastGood.get(directory) ?? defaultBrand
  }
}
export function brandAssetUrl(brand, key, fallback = '') {
  return brand.assets[key] ? `/branding/assets/${brand.assets[key]}?v=${brand.revision}` : fallback
}
function channels(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min, l = (max + min) / 2
  let h = 0
  if (delta) {
    if (max === rgb[0]) h = ((rgb[1] - rgb[2]) / delta) % 6
    else if (max === rgb[1]) h = (rgb[2] - rgb[0]) / delta + 2
    else h = (rgb[0] - rgb[1]) / delta + 4
  }
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0
  return `${((h * 60 + 360) % 360).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`
}
export function themeCss(brand, application) {
  if (!brand.configured) return ''
  const block = (mode) => {
    const p = brand.theme[mode]
    const vars = Object.entries(p).map(([key, value]) => `--brand-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value};`)
    const tokens = { primary: 'primary', 'primary-foreground': 'onPrimary', accent: 'accent', 'accent-foreground': 'onAccent', background: 'background', foreground: 'text', card: 'surface', 'card-foreground': 'text', popover: 'surface', 'popover-foreground': 'text', muted: 'background', 'muted-foreground': 'mutedText', secondary: 'background', 'secondary-foreground': 'text', border: 'border', input: 'border', ring: 'focusRing' }
    if (application === 'dashboard') {
      for (const [token, key] of Object.entries(tokens)) vars.push(`--${token}:${channels(p[key])};`)
      vars.push(`--radius:${brand.theme.shape.controlRadius};`)
    } else {
      const [h, s] = channels(p.primary).split(' ')
      for (const [step, l] of [[50, 97], [100, 92], [150, 87], [200, 82], [250, 75], [300, 68], [350, 60], [400, 52], [450, 43], [500, 35], [550, 30], [600, 25], [650, 22], [700, 19], [750, 16], [800, 13], [850, 10], [900, 7], [950, 4]]) vars.push(`--theme-primary-${step}:hsl(${h} ${s} ${l}%);`)
      for (const [step, percent] of [[0, 0], [50, 3], [100, 6], [150, 10], [200, 15], [250, 20], [300, 25], [350, 30], [400, 35], [450, 40], [500, 45], [550, 50], [600, 55], [650, 60], [700, 65], [750, 75], [800, 85], [850, 90], [900, 94], [950, 97], [1000, 100]]) vars.push(`--theme-elevation-${step}:color-mix(in srgb,${p.text} ${percent}%,${p.surface});`)
      vars.push(`--theme-primary-500:${p.primary};--theme-text:${p.text};--theme-bg:${p.background};--canvas:${p.background};--surface:${p.surface};--surface-muted:${p.background};--border-subtle:${p.border};--border-strong:${p.border};--sidebar-link-fg:${p.mutedText};--sidebar-link-hover:${p.primary};--color-white:${p.onPrimary};--link-color:${p.primary};--link-color-hover:${p.accent};--ring-color:${p.focusRing};--radius-md:${brand.theme.shape.controlRadius};--radius-lg:${brand.theme.shape.cardRadius};`)
    }
    const selector = application === 'dashboard' ? (mode === 'light' ? ':root:not(.dark)' : 'html.dark.dark') : (mode === 'light' ? ':root:not([data-theme="dark"]),html[data-theme="light"][data-theme]' : 'html[data-theme="dark"][data-theme]')
    return `${selector}{${vars.join('')}}`
  }
  const font = brand.theme.typography.fontFile
  // Stable inline style hooks. --brand-font-family is consumed by
  // client renderers (html2canvas slip capture) that must not hardcode
  // a fallback family, staying profile-driven in both applications.
  return `${block('light')}${block('dark')}
:root{--brand-font-family:${font ? 'BrandLocal,Almarai' : 'Almarai'},sans-serif}
html,html body{font-size:${brand.theme.typography.baseFontSize}}
html body{background:var(--brand-background);color:var(--brand-text)}
[data-brand-component="login-card"],[data-brand-component="card"]{border-radius:${brand.theme.shape.cardRadius}}
${font ? `@font-face{font-family:BrandLocal;src:url("/branding/assets/${font}?v=${brand.revision}");font-style:normal;font-weight:100 900;font-display:swap}html body{font-family:BrandLocal,Almarai,sans-serif;--font-base:BrandLocal,Almarai,sans-serif;--font-body:BrandLocal,Almarai,sans-serif;--font-mono:monospace}` : ''}`
}
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' }
export async function brandingResponse(request, segments, application) {
  const brand = await getBrand()
  let bytes, type
  try {
    if (segments.join('/') === 'theme.css') {
      bytes = Buffer.from(themeCss(brand, application)); type = 'text/css; charset=utf-8'
    } else {
      const directory = process.env.BRAND_DIRECTORY
      if (!directory) return new Response(null, { status: 404 })
      const custom = segments.join('/') === 'custom.css' && brand.customCss
      const file = segments.slice(1).join('/')
      if (!custom && (segments[0] !== 'assets' || !file || asset(file) !== file)) return new Response(null, { status: 404 })
      const root = await realpath(custom ? directory : path.join(directory, 'assets'))
      const filename = await realpath(path.join(root, custom ? 'theme.css' : file))
      const relative = path.relative(root, filename)
      if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response(null, { status: 404 })
      type = custom ? 'text/css; charset=utf-8' : mime[path.extname(filename).toLowerCase()]
      if (!type || (await stat(filename)).size > 10 * 1024 * 1024) return new Response(null, { status: 404 })
      bytes = await readFile(filename)
    }
  } catch { return new Response(null, { status: 404 }) }
  const etag = `"${hash(bytes)}"`
  const headers = { 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: etag, 'X-Content-Type-Options': 'nosniff' }
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  return new Response(new Uint8Array(bytes), { headers })
}
