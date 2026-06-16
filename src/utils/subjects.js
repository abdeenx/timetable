export function gradeSubjectKey(catalogId, grade) {
  return `${catalogId}:${grade}`
}

export function offeringId(gradeSubjectId, classId) {
  return `${gradeSubjectId}:${classId}`
}

// Derive the per-class teaching offerings from grade-level subject definitions.
// A grade subject applies to every class within that grade.
export function buildOfferings(gradeSubjects = [], classes = []) {
  const offerings = []
  for (const gs of gradeSubjects) {
    const gradeClasses = classes.filter((c) => c.grade === gs.grade)
    for (const cls of gradeClasses) {
      offerings.push({
        id: offeringId(gs.id, cls.id),
        gradeSubjectId: gs.id,
        catalogId: gs.catalogId,
        name: gs.name,
        grade: gs.grade,
        classId: cls.id,
        hoursPerWeek: gs.hoursPerWeek,
      })
    }
  }
  return offerings
}

export function buildSchedulingUnits(gradeSubjects, classes, assignments, teachers) {
  const offerings = buildOfferings(gradeSubjects, classes)
  return offerings.map((o) => {
    const teacherId = assignments.find((a) => a.offeringId === o.id)?.teacherId || null
    return {
      ...o,
      teacherId,
      teacher: teachers.find((t) => t.id === teacherId),
    }
  })
}

export function getClassSubjectLabel(offering, classes, formatClassLabel) {
  const cls = classes.find((c) => c.id === offering.classId)
  return cls ? `${offering.name} — ${formatClassLabel(cls)}` : offering.name
}

// Legacy: very old data stored a flat `subjects` array (one row per subject+class+teacher).
export function migrateLegacySubjects(subjects = []) {
  const classSubjects = []
  const assignments = []
  const classSubjectIdByKey = new Map()

  for (const row of subjects) {
    if (!row.catalogId || !row.classId) continue

    const key = `${row.catalogId}:${row.classId}`
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

// Migrate per-class subject definitions to per-grade definitions.
// Teacher assignments are remapped from classSubjectId -> offeringId (gradeSubjectId:classId).
export function migrateClassSubjectsToGrade(classSubjects = [], assignments = [], classes = []) {
  const classById = new Map(classes.map((c) => [c.id, c]))
  const gradeSubjects = []
  const gsByKey = new Map()

  const gradeSubjectIdFor = (catalogId, grade) => `gs-${catalogId}-${grade}`

  for (const cs of classSubjects) {
    const grade = classById.get(cs.classId)?.grade
    if (!grade) continue
    const key = gradeSubjectKey(cs.catalogId, grade)
    if (!gsByKey.has(key)) {
      const gs = {
        id: gradeSubjectIdFor(cs.catalogId, grade),
        catalogId: cs.catalogId,
        name: cs.name,
        grade,
        hoursPerWeek: cs.hoursPerWeek || 3,
      }
      gsByKey.set(key, gs)
      gradeSubjects.push(gs)
    }
  }

  const newAssignments = []
  for (const a of assignments) {
    const cs = classSubjects.find((c) => c.id === a.classSubjectId)
    if (!cs) continue
    const grade = classById.get(cs.classId)?.grade
    if (!grade) continue
    const gsId = gradeSubjectIdFor(cs.catalogId, grade)
    newAssignments.push({
      id: a.id,
      offeringId: offeringId(gsId, cs.classId),
      teacherId: a.teacherId,
    })
  }

  return { gradeSubjects, assignments: newAssignments }
}
