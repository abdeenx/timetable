export function classSubjectKey(catalogId, classId) {
  return `${catalogId}:${classId}`
}

export function migrateLegacySubjects(subjects = []) {
  const classSubjects = []
  const assignments = []
  const classSubjectIdByKey = new Map()

  for (const row of subjects) {
    if (!row.catalogId || !row.classId) continue

    const key = classSubjectKey(row.catalogId, row.classId)
    let classSubjectId = classSubjectIdByKey.get(key)

    if (!classSubjectId) {
      classSubjectId = row.classSubjectId || `${row.id}-cs`
      classSubjectIdByKey.set(key, classSubjectId)
      classSubjects.push({
        id: classSubjectId,
        catalogId: row.catalogId,
        name: row.name,
        classId: row.classId,
        hoursPerWeek: row.hoursPerWeek || 3,
      })
    }

    if (row.teacherId) {
      assignments.push({
        id: row.id,
        classSubjectId,
        teacherId: row.teacherId,
      })
    }
  }

  return { classSubjects, assignments }
}

export function buildSchedulingUnits(classSubjects, assignments, teachers) {
  return classSubjects.map((cs) => ({
    ...cs,
    teacherId: assignments.find((a) => a.classSubjectId === cs.id)?.teacherId || null,
    teacher: teachers.find(
      (t) => t.id === assignments.find((a) => a.classSubjectId === cs.id)?.teacherId,
    ),
  }))
}

export function syncTeacherLinks(teachers, classSubjects, assignments) {
  return teachers.map((teacher) => {
    const linkedClassSubjectIds = assignments
      .filter((a) => a.teacherId === teacher.id)
      .map((a) => a.classSubjectId)
    const linkedClassSubjects = classSubjects.filter((cs) =>
      linkedClassSubjectIds.includes(cs.id),
    )
    return {
      ...teacher,
      classSubjectIds: [...new Set(linkedClassSubjectIds)],
      classIds: [...new Set(linkedClassSubjects.map((cs) => cs.classId).filter(Boolean))],
      subjectIds: [...new Set(linkedClassSubjectIds)],
    }
  })
}

export function getClassSubjectLabel(classSubject, classes, formatClassLabel) {
  const cls = classes.find((c) => c.id === classSubject.classId)
  return cls
    ? `${classSubject.name} — ${formatClassLabel(cls)}`
    : classSubject.name
}
