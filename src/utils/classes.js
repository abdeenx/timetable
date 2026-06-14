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
