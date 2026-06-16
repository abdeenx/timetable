export function formatClassLabel(cls) {
  const name = String(cls?.name ?? '').trim()
  const grade = String(cls?.grade ?? '').trim()
  if (!name) return grade || 'Class'
  if (!grade || grade.toLowerCase() === name.toLowerCase()) return name
  return `${grade} ${name}`
}

export function classCompositeKey(cls) {
  const grade = String(cls?.grade ?? cls?.name ?? '').trim().toLowerCase()
  const name = String(cls?.name ?? '').trim().toLowerCase()
  return `${grade}|${name}`
}

export function isDuplicateClass(existingClasses, name, grade) {
  const key = classCompositeKey({ name, grade: grade || name })
  return existingClasses.some((c) => classCompositeKey(c) === key)
}

// Natural compare so "Grade 2" sorts before "Grade 10".
export function naturalCompare(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

// Sort classes by grade, then by class name (both natural/numeric aware).
// e.g. Grade 1 A, Grade 1 B, Grade 2 A, Grade 2 B
export function compareClasses(a, b) {
  const byGrade = naturalCompare(a?.grade ?? a?.name, b?.grade ?? b?.name)
  if (byGrade !== 0) return byGrade
  return naturalCompare(a?.name, b?.name)
}

export function sortClasses(classes = []) {
  return [...classes].sort(compareClasses)
}
