import * as XLSX from 'xlsx'

const SHEET = {
  INSTRUCTIONS: 'Instructions',
  CLASSES: 'Classes',
  TEACHERS: 'Teachers',
  SUBJECTS: 'Subjects',
}

const CLASS_HEADERS = ['Class Name', 'Grade/Year']
const TEACHER_HEADERS = [
  'Teacher Name',
  'Max Hours/Week',
  'Subject Names (comma-separated)',
  'Class Names (comma-separated)',
]
const SUBJECT_HEADERS = ['Subject Name', 'Class Name', 'Teacher Name', 'Hours/Week']

const TEMPLATE_CLASSES = [
  { 'Class Name': 'Grade 10A', 'Grade/Year': 'Grade 10' },
  { 'Class Name': 'Grade 10B', 'Grade/Year': 'Grade 10' },
]

const TEMPLATE_TEACHERS = [
  {
    'Teacher Name': 'Jane Smith',
    'Max Hours/Week': 30,
    'Subject Names (comma-separated)': 'Mathematics, Physics',
    'Class Names (comma-separated)': 'Grade 10A, Grade 10B',
  },
  {
    'Teacher Name': 'John Doe',
    'Max Hours/Week': 25,
    'Subject Names (comma-separated)': 'English',
    'Class Names (comma-separated)': 'Grade 10A',
  },
]

const TEMPLATE_SUBJECTS = [
  {
    'Subject Name': 'Mathematics',
    'Class Name': 'Grade 10A',
    'Teacher Name': 'Jane Smith',
    'Hours/Week': 5,
  },
  {
    'Subject Name': 'English',
    'Class Name': 'Grade 10A',
    'Teacher Name': 'John Doe',
    'Hours/Week': 4,
  },
  {
    'Subject Name': 'Physics',
    'Class Name': 'Grade 10B',
    'Teacher Name': 'Jane Smith',
    'Hours/Week': 3,
  },
]

const INSTRUCTIONS = [
  ['School Timetable Generator — Excel Import Guide'],
  [],
  ['Fill in the Classes, Teachers, and Subjects sheets, then upload the file in the app.'],
  [],
  ['Classes sheet'],
  ['  • Class Name — required (e.g. Grade 10A)'],
  ['  • Grade/Year — optional; defaults to class name if empty'],
  [],
  ['Teachers sheet'],
  ['  • Teacher Name — required'],
  ['  • Max Hours/Week — required number (default 30)'],
  ['  • Subject Names — optional; comma-separated subject names this teacher can teach'],
  ['  • Class Names — optional; comma-separated class names this teacher can teach'],
  [],
  ['Subjects sheet'],
  ['  • Subject Name — required'],
  ['  • Class Name — must match a row in Classes'],
  ['  • Teacher Name — must match a row in Teachers'],
  ['  • Hours/Week — required positive number'],
  [],
  ['Tips'],
  ['  • Keep sheet names unchanged (Classes, Teachers, Subjects).'],
  ['  • Names are matched case-insensitively.'],
  ['  • Download "Export current data" to edit existing entries in Excel.'],
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

function splitList(value) {
  return normalize(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
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

function buildWorkbook({ classes = TEMPLATE_CLASSES, teachers = TEMPLATE_TEACHERS, subjects = TEMPLATE_SUBJECTS, includeInstructions = true } = {}) {
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
    XLSX.utils.json_to_sheet(subjects, { header: SUBJECT_HEADERS }),
    SHEET.SUBJECTS,
  )

  return wb
}

export function downloadTemplate() {
  idCounter = 0
  const wb = buildWorkbook()
  XLSX.writeFile(wb, 'timetable-template.xlsx')
}

export function downloadCurrentData(classes, teachers, subjects) {
  const classRows = classes.map((c) => ({
    'Class Name': c.name,
    'Grade/Year': c.grade || c.name,
  }))

  const teacherRows = teachers.map((t) => {
    const subjectNames = [
      ...new Set(
        subjects.filter((s) => t.subjectIds?.includes(s.id)).map((s) => s.name),
      ),
    ]
    const classNames = classes
      .filter((c) => t.classIds?.includes(c.id))
      .map((c) => c.name)

    return {
      'Teacher Name': t.name,
      'Max Hours/Week': t.maxHoursPerWeek,
      'Subject Names (comma-separated)': subjectNames.join(', '),
      'Class Names (comma-separated)': classNames.join(', '),
    }
  })

  const subjectRows = subjects.map((s) => ({
    'Subject Name': s.name,
    'Class Name': classes.find((c) => c.id === s.classId)?.name || '',
    'Teacher Name': teachers.find((t) => t.id === s.teacherId)?.name || '',
    'Hours/Week': s.hoursPerWeek,
  }))

  const wb = buildWorkbook({
    classes: classRows.length ? classRows : TEMPLATE_CLASSES,
    teachers: teacherRows.length ? teacherRows : TEMPLATE_TEACHERS,
    subjects: subjectRows.length ? subjectRows : TEMPLATE_SUBJECTS,
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
  if (errors.length) return { errors, warnings, classes: [], teachers: [], subjects: [] }

  const classes = []
  const classIdByName = new Map()
  const seenClassNames = new Set()

  classRows.forEach((row, index) => {
    const rowNum = index + 2
    const name = normalize(getCell(row, 'Class Name', 'Class'))
    if (!name) return

    const key = normalizeKey(name)
    if (seenClassNames.has(key)) {
      warnings.push(`Classes row ${rowNum}: duplicate "${name}" skipped.`)
      return
    }

    seenClassNames.add(key)
    const grade = normalize(getCell(row, 'Grade/Year', 'Grade', 'Year')) || name
    const id = newId()
    classes.push({ id, name, grade })
    classIdByName.set(key, id)
  })

  const teachers = []
  const teacherIdByName = new Map()
  const seenTeacherNames = new Set()
  const teacherMeta = []

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
    const maxHours = parseInt(maxRaw, 10)
    if (Number.isNaN(maxHours) || maxHours < 1) {
      errors.push(`Teachers row ${rowNum}: invalid max hours for "${name}".`)
      return
    }

    const id = newId()
    teachers.push({
      id,
      name,
      maxHoursPerWeek: maxHours,
      subjectIds: [],
      classIds: [],
    })
    teacherIdByName.set(key, id)
    teacherMeta.push({
      id,
      subjectNames: splitList(
        getCell(row, 'Subject Names (comma-separated)', 'Subject Names', 'Subjects'),
      ),
      classNames: splitList(
        getCell(row, 'Class Names (comma-separated)', 'Class Names', 'Classes'),
      ),
    })
  })

  const subjects = []

  subjectRows.forEach((row, index) => {
    const rowNum = index + 2
    const name = normalize(getCell(row, 'Subject Name', 'Subject'))
    if (!name) return

    const className = normalize(getCell(row, 'Class Name', 'Class'))
    const teacherName = normalize(getCell(row, 'Teacher Name', 'Teacher'))
    const hoursRaw = getCell(row, 'Hours/Week', 'Hours Per Week', 'Hours')
    const hours = parseInt(hoursRaw, 10)

    if (!className) {
      errors.push(`Subjects row ${rowNum}: missing class for "${name}".`)
      return
    }
    if (!teacherName) {
      errors.push(`Subjects row ${rowNum}: missing teacher for "${name}".`)
      return
    }
    if (Number.isNaN(hours) || hours < 1) {
      errors.push(`Subjects row ${rowNum}: invalid hours for "${name}".`)
      return
    }

    const classId = classIdByName.get(normalizeKey(className))
    if (!classId) {
      errors.push(`Subjects row ${rowNum}: unknown class "${className}" for "${name}".`)
      return
    }

    const teacherId = teacherIdByName.get(normalizeKey(teacherName))
    if (!teacherId) {
      errors.push(`Subjects row ${rowNum}: unknown teacher "${teacherName}" for "${name}".`)
      return
    }

    subjects.push({
      id: newId(),
      name,
      hoursPerWeek: hours,
      classId,
      teacherId,
    })
  })

  if (classes.length === 0) errors.push('No classes found. Add at least one row to the Classes sheet.')
  if (teachers.length === 0) errors.push('No teachers found. Add at least one row to the Teachers sheet.')
  if (subjects.length === 0) errors.push('No subjects found. Add at least one row to the Subjects sheet.')

  if (errors.length) {
    return { errors, warnings, classes: [], teachers: [], subjects: [] }
  }

  for (const meta of teacherMeta) {
    const teacher = teachers.find((t) => t.id === meta.id)
    if (!teacher) continue

    for (const subjectName of meta.subjectNames) {
      const matches = subjects.filter((s) => normalizeKey(s.name) === normalizeKey(subjectName))
      if (matches.length === 0) {
        warnings.push(`Teacher "${teacher.name}": subject "${subjectName}" not found in Subjects sheet.`)
        continue
      }
      for (const subject of matches) {
        if (!teacher.subjectIds.includes(subject.id)) {
          teacher.subjectIds.push(subject.id)
        }
      }
    }

    for (const className of meta.classNames) {
      const classId = classIdByName.get(normalizeKey(className))
      if (!classId) {
        warnings.push(`Teacher "${teacher.name}": class "${className}" not found in Classes sheet.`)
        continue
      }
      if (!teacher.classIds.includes(classId)) {
        teacher.classIds.push(classId)
      }
    }
  }

  for (const teacher of teachers) {
    const assignedSubjects = subjects.filter((s) => s.teacherId === teacher.id)
    for (const subject of assignedSubjects) {
      if (!teacher.subjectIds.includes(subject.id)) {
        teacher.subjectIds.push(subject.id)
      }
      if (!teacher.classIds.includes(subject.classId)) {
        teacher.classIds.push(subject.classId)
      }
    }
  }

  return { errors, warnings, classes, teachers, subjects }
}

export async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
