// Build filenames that are valid on macOS, Windows, and Linux.
//
// Rules applied:
// - Remove characters illegal on Windows: < > : " / \ | ? * and control chars (0x00-0x1F)
// - Replace path separators / reserved punctuation with "-"
// - Collapse whitespace and repeated separators
// - Trim leading/trailing spaces and dots (Windows disallows trailing dots/spaces)
// - Avoid Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
// - Enforce a conservative max length for the base name

const WINDOWS_RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
])

const MAX_BASE_LENGTH = 120

export function safeFilename(base, extension = '') {
  let name = String(base ?? '').normalize('NFC')

  // eslint-disable-next-line no-control-regex
  name = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
  name = name.replace(/\s+/g, ' ').trim()
  name = name.replace(/[-_]{2,}/g, '-')
  name = name.replace(/^[.\s]+|[.\s]+$/g, '')

  if (!name) name = 'file'

  if (WINDOWS_RESERVED.has(name.toLowerCase())) {
    name = `_${name}`
  }

  if (name.length > MAX_BASE_LENGTH) {
    name = name.slice(0, MAX_BASE_LENGTH).replace(/[.\s]+$/g, '')
  }

  const ext = String(extension || '').replace(/^\.+/, '')
  return ext ? `${name}.${ext}` : name
}
