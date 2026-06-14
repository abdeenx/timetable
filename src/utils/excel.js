import * as XLSX from 'xlsx'
import { classCompositeKey, formatClassLabel } from './classes'

const SHEET = {
  INSTRUCTIONS: 'Instructions',
  CLASSES: 'Classes',
  TEACHERS: 'Teachers',
  SUBJECTS: 'Subjects',
}

const CLASS_HEADERS = ['Class Name', 'Grade/Year']
const TEACHER_HEADERS = ['Teacher Name', 'Max Hours/Week']
const SUBJECT_HEADERS = ['Subject Name']

const TEMPLATE_CLASSES = [
  { 'Class Name': 'A', 'Grade/Year': 'Grade 10' },
  { 'Class Name': 'B', 'Grade/Year': 'Grade 10' },
  { 'Class Name': 'A', 'Grade/Year': 'Grade 11' },
]

const TEMPLATE_TEACHERS = [
  { 'Teacher Name': 'Jane Smith', 'Max Hours/Week': 30 },
  { 'Teacher Name': 'John Doe', 'Max Hours/Week': 25 },
]

const TEMPLATE_SUBJECTS = [
  { 'Subject Name': 'Mathematics' },
  { 'Subject Name': 'English' },
  { 'Subject Name': 'Physics' },
]

const INSTRUCTIONS = [
  ['School Timetable Generator — Excel Import Guide'],
  [],
  ['Each sheet is a simple list. Do not repeat names across sheets.'],
  ['After import, use the Subjects tab in the app to assign each subject to a class and teacher.'],
  [],
  ['Classes sheet'],
  ['  • Class Name — required (e.g. A, 10A, Science)'],
  ['  • Grade/Year — required for grouping (e.g. Grade 10); same class name can repeat across grades'],
  [],
  ['Teachers sheet'],
  ['  • Teacher Name — required'],
  ['  • Max Hours/Week — required number (defaults to 30 if empty)'],
  [],
  ['Subjects sheet'],
  ['  • Subject Name — required (e.g. Mathematics, English)'],
  ['  • One row per subject name; no class or teacher columns needed'],
  [],
  ['Tips'],
  ['  • Keep sheet names unchanged (Classes, Teachers, Subjects).'],
  ['  • Assign subjects to classes and teachers in the web app after upload.'],
]

let idCounter = 0
function newId() {
  idCounter += 1
  return `${Date.now()}-${idCounter}`
}

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name]
  if (!sheet) return null
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

function getCell(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key]
    const match = Object.keys(row).find(
      (header) => normalizeKey(header) === normalizeKey(key),
    )
    if (match !== undefined && row[match] !== '') return row[match]
  }
  return ''
}

function buildWorkbook({
  classes = TEMPLATE_CLASSES,
  teachers = TEMPLATE_TEACHERS,
  subjectCatalog = TEMPLATE_SUBJECTS,
  includeInstructions = true,
} = {}) {
  const wb = XLSX.utils.book_new()

  if (includeInstructions) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(INSTRUCTIONS), SHEET.INSTRUCTIONS)
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(classes, { header: CLASS_HEADERS }),
    SHEET.CLASSES,
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(teachers, { header: TEACHER_HEADERS }),
    SHEET.TEACHERS,
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(subjectCatalog, { header: SUBJECT_HEADERS }),
    SHEET.SUBJECTS,
  )

  return wb
}

export function downloadTemplate() {
  idCounter = 0
  XLSX.writeFile(buildWorkbook(), 'timetable-template.xlsx')
}

export function downloadCurrentData(classes, teachers, subjectCatalog) {
  const classRows = classes.map((c) => ({
    'Class Name': c.name,
    'Grade/Year': c.grade || c.name,
  }))

  const teacherRows = teachers.map((t) => ({
    'Teacher Name': t.name,
    'Max Hours/Week': t.maxHoursPerWeek,
  }))

  const subjectRows = subjectCatalog.map((s) => ({
    'Subject Name': s.name,
  }))

  const wb = buildWorkbook({
    classes: classRows.length ? classRows : TEMPLATE_CLASSES,
    teachers: teacherRows.length ? teacherRows : TEMPLATE_TEACHERS,
    subjectCatalog: subjectRows.length ? subjectRows : TEMPLATE_SUBJECTS,
    includeInstructions: true,
  })

  XLSX.writeFile(wb, 'timetable-data.xlsx')
}

export function parseExcelFile(arrayBuffer) {
  idCounter = 0
  const errors = []
  const warnings = []

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  const classRows = sheetRows(workbook, SHEET.CLASSES)
  const teacherRows = sheetRows(workbook, SHEET.TEACHERS)
  const subjectRows = sheetRows(workbook, SHEET.SUBJECTS)

  if (!classRows) errors.push('Missing "Classes" sheet.')
  if (!teacherRows) errors.push('Missing "Teachers" sheet.')
  if (!subjectRows) errors.push('Missing "Subjects" sheet.')
  if (errors.length) {
    return { errors, warnings, classes: [], teachers: [], subjectCatalog: [], subjects: [] }
  }

  const classes = []
  const seenClasses = new Set()

  classRows.forEach((row, index) => {
    const rowNum = index + 2
    const name = normalize(getCell(row, 'Class Name', 'Class'))
    if (!name) return

    const grade = normalize(getCell(row, 'Grade/Year', 'Grade', 'Year')) || name
    const key = classCompositeKey({ name, grade })
    if (seenClasses.has(key)) {
      warnings.push(`Classes row ${rowNum}: duplicate "${formatClassLabel({ name, grade })}" skipped.`)
      return
    }

    seenClasses.add(key)
    classes.push({ id: newId(), name, grade })
  })

  const teachers = []
  const seenTeacherNames = new Set()

  teacherRows.forEach((row, index) => {
    const rowNum = index + 2
    const name = normalize(getCell(row, 'Teacher Name', 'Teacher'))
    if (!name) return

    const key = normalizeKey(name)
    if (seenTeacherNames.has(key)) {
      warnings.push(`Teachers row ${rowNum}: duplicate "${name}" skipped.`)
      return
    }

    seenTeacherNames.add(key)
    const maxRaw = getCell(row, 'Max Hours/Week', 'Max Hours', 'Max Hrs/Week')
    const maxHours = maxRaw === '' ? 30 : parseInt(maxRaw, 10)
    if (Number.isNaN(maxHours) || maxHours < 1) {
      errors.push(`Teachers row ${rowNum}: invalid max hours for "${name}".`)
      return
    }

    teachers.push({
      id: newId(),
      name,
      maxHoursPerWeek: maxHours,
      subjectIds: [],
      classIds: [],
    })
  })

  const subjectCatalog = []
  const seenSubjectNames = new Set()

  subjectRows.forEach((row, index) => {
    const rowNum = index + 2
    const name = normalize(getCell(row, 'Subject Name', 'Subject'))
    if (!name) return

    const key = normalizeKey(name)
    if (seenSubjectNames.has(key)) {
      warnings.push(`Subjects row ${rowNum}: duplicate "${name}" skipped.`)
      return
    }

    seenSubjectNames.add(key)
    subjectCatalog.push({ id: newId(), name })
  })

  if (classes.length === 0) {
    errors.push('No classes found. Add at least one row to the Classes sheet.')
  }
  if (teachers.length === 0) {
    errors.push('No teachers found. Add at least one row to the Teachers sheet.')
  }
  if (subjectCatalog.length === 0) {
    errors.push('No subjects found. Add at least one row to the Subjects sheet.')
  }

  if (errors.length) {
    return { errors, warnings, classes: [], teachers: [], subjectCatalog: [], subjects: [] }
  }

  return {
    errors,
    warnings,
    classes,
    teachers,
    subjectCatalog,
    subjects: [],
  }
}

export async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
