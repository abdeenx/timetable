import { useState } from 'react'
import { formatClassLabel, sortClasses, naturalCompare } from '../utils/classes'
import {
  gradeSubjectKey,
  buildOfferings,
  getClassSubjectLabel,
} from '../utils/subjects'
import RowActions from './RowActions'

export default function SubjectForm({
  subjectCatalog,
  onCatalogChange,
  gradeSubjects,
  onGradeSubjectsChange,
  assignments,
  onAssignmentsChange,
  teachers,
  classes,
}) {
  const [catalogName, setCatalogName] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [grade, setGrade] = useState('')
  const [periodsPerWeek, setPeriodsPerWeek] = useState(3)
  const [editingCatalogId, setEditingCatalogId] = useState(null)
  const [catalogEditName, setCatalogEditName] = useState('')
  const [catalogEditError, setCatalogEditError] = useState('')
  const [editingGradeSubjectId, setEditingGradeSubjectId] = useState(null)
  const [gradeSubjectDraft, setGradeSubjectDraft] = useState({
    catalogId: '',
    grade: '',
    hoursPerWeek: 3,
  })
  const [gradeSubjectEditError, setGradeSubjectEditError] = useState('')

  const gradeOptions = [...new Set(classes.map((c) => c.grade).filter(Boolean))].sort(naturalCompare)

  const addToCatalog = () => {
    const name = catalogName.trim()
    if (!name) return
    if (subjectCatalog.some((s) => s.name.toLowerCase() === name.toLowerCase())) return
    onCatalogChange([...subjectCatalog, { id: Date.now().toString(), name }])
    setCatalogName('')
  }

  const removeFromCatalog = (id) => {
    if (editingCatalogId === id) {
      setEditingCatalogId(null)
      setCatalogEditError('')
    }
    onCatalogChange(subjectCatalog.filter((s) => s.id !== id))
    const removedGradeSubjects = gradeSubjects.filter((gs) => gs.catalogId === id)
    const removedGsIds = new Set(removedGradeSubjects.map((gs) => gs.id))
    const nextGradeSubjects = gradeSubjects.filter((gs) => gs.catalogId !== id)
    const nextAssignments = assignments.filter(
      (a) => ![...removedGsIds].some((gsId) => a.offeringId.startsWith(`${gsId}:`)),
    )
    onGradeSubjectsChange(nextGradeSubjects)
    onAssignmentsChange(nextAssignments)
  }

  const startCatalogEdit = (entry) => {
    setEditingCatalogId(entry.id)
    setCatalogEditName(entry.name)
    setCatalogEditError('')
  }

  const cancelCatalogEdit = () => {
    setEditingCatalogId(null)
    setCatalogEditError('')
  }

  const saveCatalogEdit = () => {
    const trimmed = catalogEditName.trim()
    if (!trimmed) {
      setCatalogEditError('Subject name is required.')
      return
    }
    const duplicate = subjectCatalog.some(
      (s) => s.id !== editingCatalogId && s.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) {
      setCatalogEditError('That subject name already exists.')
      return
    }
    onCatalogChange(
      subjectCatalog.map((s) => (s.id === editingCatalogId ? { ...s, name: trimmed } : s)),
    )
    onGradeSubjectsChange(
      gradeSubjects.map((gs) =>
        gs.catalogId === editingCatalogId ? { ...gs, name: trimmed } : gs,
      ),
    )
    setEditingCatalogId(null)
    setCatalogEditError('')
  }

  const addGradeSubject = () => {
    if (!catalogId || !grade) return
    const entry = subjectCatalog.find((s) => s.id === catalogId)
    if (!entry) return
    if (
      gradeSubjects.some(
        (gs) => gradeSubjectKey(gs.catalogId, gs.grade) === gradeSubjectKey(catalogId, grade),
      )
    ) {
      return
    }

    onGradeSubjectsChange([
      ...gradeSubjects,
      {
        id: `gs-${catalogId}-${grade}-${Date.now()}`,
        catalogId,
        name: entry.name,
        grade,
        hoursPerWeek: parseInt(periodsPerWeek, 10) || 3,
      },
    ])
    setCatalogId('')
    setGrade('')
    setPeriodsPerWeek(3)
  }

  const startGradeSubjectEdit = (gs) => {
    setEditingGradeSubjectId(gs.id)
    setGradeSubjectDraft({
      catalogId: gs.catalogId,
      grade: gs.grade,
      hoursPerWeek: gs.hoursPerWeek,
    })
    setGradeSubjectEditError('')
  }

  const cancelGradeSubjectEdit = () => {
    setEditingGradeSubjectId(null)
    setGradeSubjectEditError('')
  }

  const saveGradeSubjectEdit = () => {
    const entry = subjectCatalog.find((s) => s.id === gradeSubjectDraft.catalogId)
    if (!entry) {
      setGradeSubjectEditError('Select a valid subject.')
      return
    }
    if (!gradeSubjectDraft.grade) {
      setGradeSubjectEditError('Select a grade.')
      return
    }
    const hours = parseInt(gradeSubjectDraft.hoursPerWeek, 10)
    if (Number.isNaN(hours) || hours < 1) {
      setGradeSubjectEditError('Periods must be at least 1.')
      return
    }
    const duplicate = gradeSubjects.some(
      (gs) =>
        gs.id !== editingGradeSubjectId &&
        gradeSubjectKey(gs.catalogId, gs.grade) ===
          gradeSubjectKey(gradeSubjectDraft.catalogId, gradeSubjectDraft.grade),
    )
    if (duplicate) {
      setGradeSubjectEditError('That subject is already defined for this grade.')
      return
    }

    onGradeSubjectsChange(
      gradeSubjects.map((gs) =>
        gs.id === editingGradeSubjectId
          ? {
              ...gs,
              catalogId: gradeSubjectDraft.catalogId,
              name: entry.name,
              grade: gradeSubjectDraft.grade,
              hoursPerWeek: hours,
            }
          : gs,
      ),
    )
    setEditingGradeSubjectId(null)
    setGradeSubjectEditError('')
  }

  const removeGradeSubject = (id) => {
    if (editingGradeSubjectId === id) cancelGradeSubjectEdit()
    const nextGradeSubjects = gradeSubjects.filter((gs) => gs.id !== id)
    const nextAssignments = assignments.filter((a) => !a.offeringId.startsWith(`${id}:`))
    onGradeSubjectsChange(nextGradeSubjects)
    onAssignmentsChange(nextAssignments)
  }

  const isTeacherAssignable = (teacher, offering) => {
    if (!teacher || !offering) return false
    const teachesSubject =
      Array.isArray(teacher.subjectCatalogIds) &&
      teacher.subjectCatalogIds.includes(offering.catalogId)

    const availableGrades = teacher.availableGrades || []
    const gradeOk = !availableGrades.length || availableGrades.includes(offering.grade)

    return teachesSubject && gradeOk
  }

  const setOfferingTeacher = (offering, nextTeacherId) => {
    const existing = assignments.find((a) => a.offeringId === offering.id)
    let nextAssignments
    if (!nextTeacherId) {
      nextAssignments = assignments.filter((a) => a.offeringId !== offering.id)
    } else if (existing) {
      nextAssignments = assignments.map((a) =>
        a.offeringId === offering.id ? { ...a, teacherId: nextTeacherId } : a,
      )
    } else {
      nextAssignments = [
        ...assignments,
        { id: Date.now().toString(), offeringId: offering.id, teacherId: nextTeacherId },
      ]
    }
    onAssignmentsChange(nextAssignments)
  }

  const offerings = buildOfferings(gradeSubjects, sortClasses(classes))
  const unassignedOfferings = offerings.filter(
    (o) => !assignments.some((a) => a.offeringId === o.id && a.teacherId),
  )

  return (
    <>
      <div className="form-container">
        <h2>Subject list</h2>
        <p className="form-help">
          Subject names only — import from Excel or add here. Set weekly periods per grade below, then assign teachers per class.
        </p>

        <div className="form-row">
          <input
            type="text"
            placeholder="Subject name (e.g. Mathematics)"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToCatalog()}
          />
          <button type="button" className="btn-small" onClick={addToCatalog}>
            Add to list
          </button>
        </div>

        {catalogEditError && <p className="form-inline-error">{catalogEditError}</p>}

        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjectCatalog.map((s) => {
              const isEditing = editingCatalogId === s.id
              return (
                <tr key={s.id}>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="table-input"
                        value={catalogEditName}
                        onChange={(e) => setCatalogEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCatalogEdit()
                          if (e.key === 'Escape') cancelCatalogEdit()
                        }}
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td>
                    <RowActions
                      isEditing={isEditing}
                      onEdit={() => startCatalogEdit(s)}
                      onSave={saveCatalogEdit}
                      onCancel={cancelCatalogEdit}
                      onDelete={() => removeFromCatalog(s.id)}
                    />
                  </td>
                </tr>
              )
            })}
            {subjectCatalog.length === 0 && (
              <tr>
                <td colSpan="2" className="empty">
                  No subjects in list. Import from Excel or add above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="form-container">
        <h2>Periods by grade</h2>
        <p className="form-help">
          Weekly periods apply to the subject across every class in that grade, independent of which teacher is assigned.
        </p>

        {gradeSubjectEditError && <p className="form-inline-error">{gradeSubjectEditError}</p>}

        <div className="form-row">
          <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
            <option value="">Select subject...</option>
            {subjectCatalog.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Select grade...</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="40"
            value={periodsPerWeek}
            onChange={(e) => setPeriodsPerWeek(e.target.value)}
            style={{ width: '90px' }}
            title="Periods per week for this subject in this grade"
          />
          <span className="label">periods/wk</span>
          <button
            type="button"
            className="btn-small"
            onClick={addGradeSubject}
            disabled={!catalogId || !grade || subjectCatalog.length === 0}
          >
            Add
          </button>
        </div>

        {gradeOptions.length === 0 && (
          <p className="dim">Add classes (with grades) first to define periods by grade.</p>
        )}

        <table className="data-table assignment-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Grade</th>
              <th>Classes in grade</th>
              <th>Periods/Week</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {gradeSubjects.map((gs) => {
              const isEditing = editingGradeSubjectId === gs.id
              const classesInGrade = sortClasses(classes.filter((c) => c.grade === gs.grade))
              return (
                <tr key={gs.id}>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input"
                        value={gradeSubjectDraft.catalogId}
                        onChange={(e) =>
                          setGradeSubjectDraft({ ...gradeSubjectDraft, catalogId: e.target.value })
                        }
                      >
                        {subjectCatalog.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      gs.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input"
                        value={gradeSubjectDraft.grade}
                        onChange={(e) =>
                          setGradeSubjectDraft({ ...gradeSubjectDraft, grade: e.target.value })
                        }
                      >
                        {gradeOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    ) : (
                      gs.grade
                    )}
                  </td>
                  <td>
                    {classesInGrade.length
                      ? classesInGrade.map((c) => formatClassLabel(c)).join(', ')
                      : '— (no classes in this grade)'}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="40"
                        className="table-input hours-input"
                        value={gradeSubjectDraft.hoursPerWeek}
                        onChange={(e) =>
                          setGradeSubjectDraft({
                            ...gradeSubjectDraft,
                            hoursPerWeek: e.target.value,
                          })
                        }
                      />
                    ) : (
                      gs.hoursPerWeek
                    )}
                  </td>
                  <td>
                    <RowActions
                      isEditing={isEditing}
                      onEdit={() => startGradeSubjectEdit(gs)}
                      onSave={saveGradeSubjectEdit}
                      onCancel={cancelGradeSubjectEdit}
                      onDelete={() => removeGradeSubject(gs.id)}
                    />
                  </td>
                </tr>
              )
            })}
            {gradeSubjects.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No subject-grade periods yet. Add a subject and grade above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="form-container">
        <h2>Assign teachers</h2>
        <p className="form-help">
          Each class in a grade inherits that grade&apos;s subjects and periods. Assign a teacher per class. Only teachers who teach the subject and are available for the class/grade are listed.
        </p>

        {unassignedOfferings.length > 0 && (
          <div className="warnings">
            <p>{unassignedOfferings.length} subject-class offering(s) still need a teacher.</p>
          </div>
        )}

        <table className="data-table assignment-table">
          <thead>
            <tr>
              <th>Subject — Class</th>
              <th>Periods/Week</th>
              <th>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {offerings.map((offering) => {
              const assignment = assignments.find((a) => a.offeringId === offering.id)
              const eligibleTeachers = teachers.filter((t) => isTeacherAssignable(t, offering))
              return (
                <tr key={offering.id}>
                  <td>{getClassSubjectLabel(offering, classes, formatClassLabel)}</td>
                  <td>{offering.hoursPerWeek}</td>
                  <td>
                    <select
                      className="table-input"
                      value={assignment?.teacherId || ''}
                      onChange={(e) => setOfferingTeacher(offering, e.target.value)}
                      aria-label={`Teacher for ${getClassSubjectLabel(offering, classes, formatClassLabel)}`}
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
                </tr>
              )
            })}
            {offerings.length === 0 && (
              <tr>
                <td colSpan="3" className="empty">
                  No offerings yet. Define periods by grade above (and add classes to those grades).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
