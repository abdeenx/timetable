import { useState } from 'react'
import {
  formatClassLabel,
  isDuplicateClass,
  classCompositeKey,
  naturalCompare,
  sortClasses,
} from '../utils/classes'
import { gradeSubjectKey, offeringId, eligibleTeachersFor } from '../utils/subjects'
import RowActions from './RowActions'
import TeacherForm from './TeacherForm'

export default function SetupWorkspace({
  classes = [],
  subjectCatalog = [],
  gradeSubjects = [],
  assignments = [],
  teachers = [],
  onChange,
}) {
  const [selectedClassId, setSelectedClassId] = useState(null)

  const [classDraft, setClassDraft] = useState({ name: '', grade: '' })
  const [classError, setClassError] = useState('')
  const [editingClassId, setEditingClassId] = useState(null)
  const [classEditDraft, setClassEditDraft] = useState({ name: '', grade: '' })

  const [rowDraft, setRowDraft] = useState({ subject: '', hoursPerWeek: 3 })
  const [rowError, setRowError] = useState('')

  const [editingSubjectId, setEditingSubjectId] = useState(null)
  const [subjectEditName, setSubjectEditName] = useState('')
  const [subjectError, setSubjectError] = useState('')

  const sortedClasses = sortClasses(classes)

  // Fall back to the first class so the workspace always has a subject to show,
  // even before the user clicks anything (and on first paint).
  const selectedClass =
    sortedClasses.find((c) => c.id === selectedClassId) || sortedClasses[0] || null
  const activeClassId = selectedClass?.id ?? null

  const gradeGroups = []
  for (const cls of sortedClasses) {
    const grade = cls.grade || '—'
    let group = gradeGroups.find((g) => g.grade === grade)
    if (!group) {
      group = { grade, classes: [] }
      gradeGroups.push(group)
    }
    group.classes.push(cls)
  }
  const gradeOptions = gradeGroups.map((g) => g.grade)

  const sortedCatalog = [...subjectCatalog].sort((a, b) => a.name.localeCompare(b.name))

  const curriculumRows = selectedClass
    ? gradeSubjects
        .filter((gs) => gs.grade === selectedClass.grade)
        .sort((a, b) => naturalCompare(a.name, b.name))
    : []

  const assignmentFor = (gs) =>
    selectedClass ? assignments.find((a) => a.offeringId === offeringId(gs.id, selectedClass.id)) : null

  const rowsMissingTeacher = selectedClass
    ? curriculumRows.filter(
        (gs) =>
          !assignments.some(
            (a) => a.offeringId === offeringId(gs.id, selectedClass.id) && a.teacherId,
          ),
      )
    : []

  const rowsWithNoEligible = selectedClass
    ? curriculumRows.filter(
        (gs) =>
          eligibleTeachersFor(teachers, {
            catalogId: gs.catalogId,
            grade: selectedClass.grade,
          }).length === 0,
      )
    : []

  const addClass = () => {
    const name = classDraft.name.trim()
    if (!name) {
      setClassError('Enter a class name.')
      return
    }
    const grade = classDraft.grade.trim() || name
    if (isDuplicateClass(classes, name, grade)) {
      setClassError('That class already exists in that grade.')
      return
    }
    const id = Date.now().toString()
    onChange({ classes: [...classes, { id, name, grade }] })
    setClassDraft({ name: '', grade: '' })
    setClassError('')
    setSelectedClassId(id)
  }

  const startEditClass = (cls) => {
    setEditingClassId(cls.id)
    setClassEditDraft({ name: cls.name, grade: cls.grade })
    setClassError('')
  }

  const cancelEditClass = () => {
    setEditingClassId(null)
    setClassError('')
  }

  const saveEditClass = () => {
    const name = classEditDraft.name.trim()
    const grade = classEditDraft.grade.trim() || name
    if (!name) {
      setClassError('Class name is required.')
      return
    }
    const duplicate = classes.some(
      (c) =>
        c.id !== editingClassId &&
        classCompositeKey(c) === classCompositeKey({ name, grade }),
    )
    if (duplicate) {
      setClassError('A class with this name and grade already exists.')
      return
    }
    onChange({ classes: classes.map((c) => (c.id === editingClassId ? { ...c, name, grade } : c)) })
    setEditingClassId(null)
    setClassError('')
  }

  const removeClass = (id) => {
    if (editingClassId === id) cancelEditClass()
    const nextAssignments = assignments.filter((a) => !a.offeringId.endsWith(`:${id}`))
    onChange({
      classes: classes.filter((c) => c.id !== id),
      ...(nextAssignments.length !== assignments.length ? { assignments: nextAssignments } : {}),
    })
  }

  const addCurriculumRow = () => {
    if (!selectedClass) return
    const name = rowDraft.subject.trim()
    if (!name) {
      setRowError('Enter a subject name.')
      return
    }
    const grade = selectedClass.grade
    const existing = subjectCatalog.find((s) => s.name.toLowerCase() === name.toLowerCase())
    const catalogId = existing ? existing.id : `subj-${Date.now()}`

    if (
      gradeSubjects.some(
        (gs) => gradeSubjectKey(gs.catalogId, gs.grade) === gradeSubjectKey(catalogId, grade),
      )
    ) {
      setRowError(`${existing ? existing.name : name} is already in ${grade}.`)
      return
    }

    const hours = parseInt(rowDraft.hoursPerWeek, 10)
    onChange({
      ...(existing ? {} : { subjectCatalog: [...subjectCatalog, { id: catalogId, name }] }),
      gradeSubjects: [
        ...gradeSubjects,
        {
          id: `gs-${catalogId}-${grade}-${Date.now()}`,
          catalogId,
          name: existing ? existing.name : name,
          grade,
          hoursPerWeek: Number.isFinite(hours) && hours >= 1 ? Math.min(40, hours) : 3,
        },
      ],
    })
    setRowDraft({ subject: '', hoursPerWeek: 3 })
    setRowError('')
  }

  const updateHours = (gsId, raw) => {
    const hours = parseInt(raw, 10)
    if (!Number.isFinite(hours) || hours < 1) return
    onChange({
      gradeSubjects: gradeSubjects.map((gs) =>
        gs.id === gsId ? { ...gs, hoursPerWeek: Math.min(40, hours) } : gs,
      ),
    })
  }

  const setOfferingTeacher = (gs, teacherId) => {
    if (!selectedClass) return
    const target = offeringId(gs.id, selectedClass.id)
    const existing = assignments.find((a) => a.offeringId === target)
    let next
    if (!teacherId) {
      next = assignments.filter((a) => a.offeringId !== target)
    } else if (existing) {
      next = assignments.map((a) => (a.offeringId === target ? { ...a, teacherId } : a))
    } else {
      next = [...assignments, { id: Date.now().toString(), offeringId: target, teacherId }]
    }
    onChange({ assignments: next })
  }

  const removeGradeSubject = (gsId) => {
    const nextAssignments = assignments.filter((a) => !a.offeringId.startsWith(`${gsId}:`))
    onChange({
      gradeSubjects: gradeSubjects.filter((gs) => gs.id !== gsId),
      ...(nextAssignments.length !== assignments.length ? { assignments: nextAssignments } : {}),
    })
  }

  const removeSubject = (id) => {
    const removedGsIds = new Set(gradeSubjects.filter((gs) => gs.catalogId === id).map((gs) => gs.id))
    const nextAssignments = assignments.filter(
      (a) => ![...removedGsIds].some((gsId) => a.offeringId.startsWith(`${gsId}:`)),
    )
    onChange({
      subjectCatalog: subjectCatalog.filter((s) => s.id !== id),
      gradeSubjects: gradeSubjects.filter((gs) => gs.catalogId !== id),
      ...(nextAssignments.length !== assignments.length ? { assignments: nextAssignments } : {}),
    })
  }

  const saveSubjectEdit = () => {
    const trimmed = subjectEditName.trim()
    if (!trimmed) {
      setSubjectError('Subject name is required.')
      return
    }
    if (
      subjectCatalog.some(
        (s) => s.id !== editingSubjectId && s.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setSubjectError('That subject name already exists.')
      return
    }
    onChange({
      subjectCatalog: subjectCatalog.map((s) =>
        s.id === editingSubjectId ? { ...s, name: trimmed } : s,
      ),
      gradeSubjects: gradeSubjects.map((gs) =>
        gs.catalogId === editingSubjectId ? { ...gs, name: trimmed } : gs,
      ),
    })
    setEditingSubjectId(null)
    setSubjectError('')
  }

  return (
    <>
      <div className="setup-grid">
        <div className="form-container setup-pane">
          <h2>Classes</h2>
          <p className="form-help">Add classes, then build each class&apos;s curriculum.</p>

          <div className="form-row">
            <input
              type="text"
              placeholder="Class name (e.g. A, 10A)"
              value={classDraft.name}
              onChange={(e) => setClassDraft({ ...classDraft, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addClass()}
            />
            <input
              type="text"
              list="grade-options"
              placeholder="Grade/Year (e.g. Grade 10)"
              value={classDraft.grade}
              onChange={(e) => setClassDraft({ ...classDraft, grade: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addClass()}
            />
            <datalist id="grade-options">
              {gradeOptions.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <button type="button" className="btn-small" onClick={addClass}>
              Add class
            </button>
          </div>

          {classError && <p className="form-inline-error">{classError}</p>}

          {gradeGroups.length === 0 && <p className="dim">No classes yet.</p>}

          {gradeGroups.map((group) => (
            <div key={group.grade} className="grade-group">
              <div className="grade-title">{group.grade}</div>
              {group.classes.map((cls) => {
                const isEditing = editingClassId === cls.id
                const isActive = cls.id === activeClassId && !isEditing
                return (
                  <div key={cls.id} className={`class-item${isActive ? ' active' : ''}`}>
                    {isEditing ? (
                      <div className="class-edit">
                        <input
                          type="text"
                          className="table-input"
                          value={classEditDraft.name}
                          onChange={(e) => setClassEditDraft({ ...classEditDraft, name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="table-input"
                          value={classEditDraft.grade}
                          onChange={(e) => setClassEditDraft({ ...classEditDraft, grade: e.target.value })}
                        />
                        <RowActions
                          isEditing
                          onSave={saveEditClass}
                          onCancel={cancelEditClass}
                          onEdit={() => {}}
                          onDelete={() => {}}
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="class-select"
                          onClick={() => setSelectedClassId(cls.id)}
                        >
                          {formatClassLabel(cls)}
                        </button>
                        <RowActions
                          isEditing={false}
                          onEdit={() => startEditClass(cls)}
                          onCancel={() => {}}
                          onSave={() => {}}
                          onDelete={() => removeClass(cls.id)}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="form-container setup-pane">
          {!selectedClass ? (
            <>
              <h2>Curriculum</h2>
              <div className="empty-state">Add or select a class to start its curriculum.</div>
            </>
          ) : (
            <>
              <h2>Curriculum — {formatClassLabel(selectedClass)}</h2>
              <p className="form-help">
                Subjects for {selectedClass.grade}. Weekly lessons apply to every class in the
                grade; the teacher is chosen per class. Leave a teacher blank and Generate
                will assign an eligible one.
              </p>

              {rowsWithNoEligible.length > 0 && (
                <div className="warnings">
                  <p>
                    {rowsWithNoEligible.length} subject
                    {rowsWithNoEligible.length === 1 ? '' : 's'} have no eligible teacher for{' '}
                    {selectedClass.grade} — they will stay &quot;Unassigned&quot; until you add one.
                  </p>
                </div>
              )}
              {rowsMissingTeacher.length > 0 && rowsWithNoEligible.length === 0 && (
                <p className="dim">
                  {rowsMissingTeacher.length} subject
                  {rowsMissingTeacher.length === 1 ? '' : 's'} have no teacher chosen yet — Generate
                  will pick an eligible one. Choose here to override.
                </p>
              )}

              <div className="form-row">
                <input
                  type="text"
                  list="subject-options"
                  placeholder="Subject (e.g. Mathematics)"
                  value={rowDraft.subject}
                  onChange={(e) => setRowDraft({ ...rowDraft, subject: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCurriculumRow()}
                />
                <datalist id="subject-options">
                  {sortedCatalog.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={rowDraft.hoursPerWeek}
                  onChange={(e) => setRowDraft({ ...rowDraft, hoursPerWeek: e.target.value })}
                  style={{ width: '90px' }}
                  title="Lessons per week for this subject in this grade"
                />
                <span className="label">lessons/wk</span>
                <button type="button" className="btn-small" onClick={addCurriculumRow}>
                  Add subject
                </button>
              </div>

              {rowError && <p className="form-inline-error">{rowError}</p>}

              <table className="data-table assignment-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Lessons/wk</th>
                    <th>Teacher</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {curriculumRows.map((gs) => {
                    const assignment = assignmentFor(gs)
                    const eligibleTeachers = eligibleTeachersFor(teachers, {
                      catalogId: gs.catalogId,
                      grade: selectedClass.grade,
                    })
                    return (
                      <tr key={gs.id}>
                        <td>{gs.name}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="40"
                            className="table-input hours-input"
                            value={gs.hoursPerWeek}
                            onChange={(e) => updateHours(gs.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="table-input"
                            value={assignment?.teacherId || ''}
                            onChange={(e) => setOfferingTeacher(gs, e.target.value)}
                            aria-label={`Teacher for ${gs.name}`}
                          >
                            <option value="">
                              {eligibleTeachers.length ? 'Select teacher...' : 'No eligible teachers'}
                            </option>
                            {eligibleTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => removeGradeSubject(gs.id)}
                            title={`Remove ${gs.name} from ${gs.grade}`}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {curriculumRows.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty">
                        No subjects for this grade yet. Add one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {teachers.length === 0 && (
                <p className="dim">Add teachers below to assign them here.</p>
              )}
            </>
          )}

          {subjectCatalog.length > 0 && (
            <details className="subject-manager">
              <summary>Manage subjects</summary>
              {subjectError && <p className="form-inline-error">{subjectError}</p>}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCatalog.map((s) => {
                    const isEditing = editingSubjectId === s.id
                    return (
                      <tr key={s.id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input"
                              value={subjectEditName}
                              onChange={(e) => setSubjectEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveSubjectEdit()
                                if (e.key === 'Escape') {
                                  setEditingSubjectId(null)
                                  setSubjectError('')
                                }
                              }}
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td>
                          <RowActions
                            isEditing={isEditing}
                            onEdit={() => {
                              setEditingSubjectId(s.id)
                              setSubjectEditName(s.name)
                              setSubjectError('')
                            }}
                            onSave={saveSubjectEdit}
                            onCancel={() => {
                              setEditingSubjectId(null)
                              setSubjectError('')
                            }}
                            onDelete={() => removeSubject(s.id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </details>
          )}
        </div>
      </div>

      <TeacherForm
        teachers={teachers}
        subjectCatalog={subjectCatalog}
        classes={classes}
        onChange={(nextTeachers) => onChange({ teachers: nextTeachers })}
      />
    </>
  )
}
