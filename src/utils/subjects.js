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

// A teacher can cover an offering when they teach its subject and are available
// for its grade. An empty availableGrades list means "all grades".
export function isTeacherEligible(teacher, offering) {
  if (!teacher || !offering) return false
  const teaches =
    Array.isArray(teacher.subjectCatalogIds) &&
    teacher.subjectCatalogIds.includes(offering.catalogId)
  const grades = teacher.availableGrades || []
  const gradeOk = !grades.length || grades.includes(offering.grade)
  return teaches && gradeOk
}

export function eligibleTeachersFor(teachers = [], offering) {
  return teachers.filter((t) => isTeacherEligible(t, offering))
}

// Fill in teacher assignments for offerings that don't have one, so Generate
// doesn't block on manual bookkeeping. Manual choices are kept; only gaps are
// filled. Picks the eligible teacher with the most remaining weekly capacity,
// tie-broken by current load then name, to spread work evenly.
// Returns the (possibly new) assignment list, how many were added, and the
// offerings no teacher can cover.
export function autoAssignTeachers(
  gradeSubjects = [],
  classes = [],
  assignments = [],
  teachers = [],
) {
  const offerings = buildOfferings(gradeSubjects, classes)
  const offeringById = new Map(offerings.map((o) => [o.id, o]))

  const loadByTeacher = new Map(teachers.map((t) => [t.id, 0]))
  const assignedOfferingIds = new Set()

  for (const a of assignments) {
    if (!a.teacherId) continue
    assignedOfferingIds.add(a.offeringId)
    const offering = offeringById.get(a.offeringId)
    if (offering) {
      loadByTeacher.set(a.teacherId, (loadByTeacher.get(a.teacherId) || 0) + offering.hoursPerWeek)
    }
  }

  const next = [...assignments]
  const unresolved = []
  let added = 0

  for (const offering of offerings) {
    if (assignedOfferingIds.has(offering.id)) continue

    const eligible = eligibleTeachersFor(teachers, offering)
    if (eligible.length === 0) {
      unresolved.push(offering)
      continue
    }

    eligible.sort((a, b) => {
      const remainingA =
        (Number.isFinite(a.maxHoursPerWeek) ? a.maxHoursPerWeek : Infinity) -
        (loadByTeacher.get(a.id) || 0)
      const remainingB =
        (Number.isFinite(b.maxHoursPerWeek) ? b.maxHoursPerWeek : Infinity) -
        (loadByTeacher.get(b.id) || 0)
      if (remainingB !== remainingA) return remainingB - remainingA
      const loadA = loadByTeacher.get(a.id) || 0
      const loadB = loadByTeacher.get(b.id) || 0
      if (loadA !== loadB) return loadA - loadB
      return String(a.name).localeCompare(String(b.name))
    })

    const chosen = eligible[0]
    loadByTeacher.set(chosen.id, (loadByTeacher.get(chosen.id) || 0) + offering.hoursPerWeek)

    const existingIndex = next.findIndex((a) => a.offeringId === offering.id)
    const record = { id: `auto-${offering.id}`, offeringId: offering.id, teacherId: chosen.id }
    if (existingIndex >= 0) next[existingIndex] = record
    else next.push(record)
    added += 1
  }

  return { assignments: next, added, unresolved }
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
