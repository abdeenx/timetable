import { fileTimestamp } from './datetime'
import { safeFilename } from './filenames'

const BACKUP_VERSION = 1
const BACKUP_TYPE = 'school-timetable-generator-backup'

const FIELDS = [
  'subjectCatalog',
  'gradeSubjects',
  'assignments',
  'classes',
  'teachers',
  'periodDurationMinutes',
  'weekStartDay',
  'weekLength',
  'firstPeriodStartTime',
  'breaks',
  'periodsPerDay',
  'fixedSlots',
]

// Older backups stored per-class subjects; keep them on restore so they can be migrated.
const LEGACY_FIELDS = ['classSubjects', 'subjects']

export function buildBackup(state) {
  const payload = {}
  for (const field of FIELDS) {
    payload[field] = state[field]
  }
  return {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: payload,
  }
}

export function downloadBackup(state) {
  const backup = buildBackup(state)
  const json = JSON.stringify(backup)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeFilename(`timetable-backup-${fileTimestamp()}`, 'json')
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid backup file: not valid JSON.')
  }

  const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: unexpected format.')
  }

  if (parsed?.type && parsed.type !== BACKUP_TYPE) {
    throw new Error('This file is not a Timetable Generator backup.')
  }

  const result = {}
  for (const field of [...FIELDS, ...LEGACY_FIELDS]) {
    if (data[field] !== undefined) result[field] = data[field]
  }

  if (
    !Array.isArray(result.classes) &&
    !Array.isArray(result.teachers) &&
    !Array.isArray(result.subjectCatalog)
  ) {
    throw new Error('Backup file does not contain recognizable timetable data.')
  }

  return result
}

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
