import { useState } from 'react'
import { formatClassLabel } from '../utils/classes'
import {
  classSubjectKey,
  getClassSubjectLabel,
  syncTeacherLinks,
} from '../utils/subjects'
import RowActions from './RowActions'

export default function SubjectForm({
  subjectCatalog,
  onCatalogChange,
  classSubjects,
  onClassSubjectsChange,
  assignments,
  onAssignmentsChange,
  teachers,
  classes,
  onTeachersChange,
}) {
  const [catalogName, setCatalogName] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [classId, setClassId] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(3)
  const [classSubjectId, setClassSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [editingCatalogId, setEditingCatalogId] = useState(null)
  const [catalogEditName, setCatalogEditName] = useState('')
  const [catalogEditError, setCatalogEditError] = useState('')
  const [editingClassSubjectId, setEditingClassSubjectId] = useState(null)
  const [classSubjectDraft, setClassSubjectDraft] = useState({
    catalogId: '',
    classId: '',
    hoursPerWeek: 3,
  })
  const [classSubjectEditError, setClassSubjectEditError] = useState('')

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
    const removedClassSubjects = classSubjects.filter((cs) => cs.catalogId === id)
    const removedIds = new Set(removedClassSubjects.map((cs) => cs.id))
    const nextClassSubjects = classSubjects.filter((cs) => cs.catalogId !== id)
    const nextAssignments = assignments.filter((a) => !removedIds.has(a.classSubjectId))
    onClassSubjectsChange(nextClassSubjects)
    onAssignmentsChange(nextAssignments)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, nextClassSubjects, nextAssignments))
    }
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
    onClassSubjectsChange(
      classSubjects.map((cs) =>
        cs.catalogId === editingCatalogId ? { ...cs, name: trimmed } : cs,
      ),
    )
    setEditingCatalogId(null)
    setCatalogEditError('')
  }

  const addClassSubject = () => {
    if (!catalogId || !classId) return
    const entry = subjectCatalog.find((s) => s.id === catalogId)
    if (!entry) return
    if (classSubjects.some((cs) => classSubjectKey(cs.catalogId, cs.classId) === classSubjectKey(catalogId, classId))) {
      return
    }

    onClassSubjectsChange([
      ...classSubjects,
      {
        id: Date.now().toString(),
        catalogId,
        name: entry.name,
        classId,
        hoursPerWeek: parseInt(hoursPerWeek, 10) || 3,
      },
    ])
    setCatalogId('')
    setClassId('')
    setHoursPerWeek(3)
  }

  const startClassSubjectEdit = (cs) => {
    setEditingClassSubjectId(cs.id)
    setClassSubjectDraft({
      catalogId: cs.catalogId,
      classId: cs.classId,
      hoursPerWeek: cs.hoursPerWeek,
    })
    setClassSubjectEditError('')
  }

  const cancelClassSubjectEdit = () => {
    setEditingClassSubjectId(null)
    setClassSubjectEditError('')
  }

  const saveClassSubjectEdit = () => {
    const entry = subjectCatalog.find((s) => s.id === classSubjectDraft.catalogId)
    if (!entry) {
      setClassSubjectEditError('Select a valid subject.')
      return
    }
    if (!classSubjectDraft.classId) {
      setClassSubjectEditError('Select a class.')
      return
    }
    const hours = parseInt(classSubjectDraft.hoursPerWeek, 10)
    if (Number.isNaN(hours) || hours < 1) {
      setClassSubjectEditError('Hours must be at least 1.')
      return
    }
    const duplicate = classSubjects.some(
      (cs) =>
        cs.id !== editingClassSubjectId &&
        classSubjectKey(cs.catalogId, cs.classId) ===
          classSubjectKey(classSubjectDraft.catalogId, classSubjectDraft.classId),
    )
    if (duplicate) {
      setClassSubjectEditError('That subject is already scheduled for this class.')
      return
    }

    onClassSubjectsChange(
      classSubjects.map((cs) =>
        cs.id === editingClassSubjectId
          ? {
              ...cs,
              catalogId: classSubjectDraft.catalogId,
              name: entry.name,
              classId: classSubjectDraft.classId,
              hoursPerWeek: hours,
            }
          : cs,
      ),
    )
    setEditingClassSubjectId(null)
    setClassSubjectEditError('')
  }

  const removeClassSubject = (id) => {
    if (editingClassSubjectId === id) cancelClassSubjectEdit()
    const nextClassSubjects = classSubjects.filter((cs) => cs.id !== id)
    const nextAssignments = assignments.filter((a) => a.classSubjectId !== id)
    onClassSubjectsChange(nextClassSubjects)
    onAssignmentsChange(nextAssignments)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, nextClassSubjects, nextAssignments))
    }
  }

  const addAssignment = () => {
    if (!classSubjectId || !teacherId) return
    if (assignments.some((a) => a.classSubjectId === classSubjectId)) return

    const nextAssignments = [
      ...assignments,
      {
        id: Date.now().toString(),
        classSubjectId,
        teacherId,
      },
    ]
    onAssignmentsChange(nextAssignments)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, classSubjects, nextAssignments))
    }
    setClassSubjectId('')
    setTeacherId('')
  }

  const updateAssignmentTeacher = (assignmentId, nextTeacherId) => {
    const nextAssignments = assignments.map((a) =>
      a.id === assignmentId ? { ...a, teacherId: nextTeacherId } : a,
    )
    onAssignmentsChange(nextAssignments)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, classSubjects, nextAssignments))
    }
  }

  const removeAssignment = (id) => {
    const nextAssignments = assignments.filter((a) => a.id !== id)
    onAssignmentsChange(nextAssignments)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, classSubjects, nextAssignments))
    }
  }

  const selectedClass = classes.find((c) => c.id === classId)
  const classOfferings = classSubjects.filter((cs) => cs.classId === classId)
  const unassignedOfferings = classSubjects.filter(
    (cs) => !assignments.some((a) => a.classSubjectId === cs.id),
  )

  return (
    <>
      <div className="form-container">
        <h2>Subject list</h2>
        <p className="form-help">
          Subject names only — import from Excel or add here. Set weekly hours per class below, then assign teachers.
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
        <h2>Hours by class</h2>
        <p className="form-help">
          Weekly hours apply to the subject in each class, independent of which teacher is assigned.
        </p>

        {classSubjectEditError && <p className="form-inline-error">{classSubjectEditError}</p>}

        <div className="form-row">
          <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
            <option value="">Select subject...</option>
            {subjectCatalog.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {formatClassLabel(c)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="40"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
            style={{ width: '90px' }}
            title="Hours per week for this subject in this class"
          />
          <span className="label">hrs/wk</span>
          <button
            type="button"
            className="btn-small"
            onClick={addClassSubject}
            disabled={!catalogId || !classId || subjectCatalog.length === 0}
          >
            Add
          </button>
        </div>

        {classId && selectedClass && (
          <div className="class-summary">
            <strong>{formatClassLabel(selectedClass)}</strong>:{' '}
            {classOfferings.reduce((sum, cs) => sum + cs.hoursPerWeek, 0)} hrs/week scheduled
            {classOfferings.length > 0 && ` (${classOfferings.map((cs) => cs.name).join(', ')})`}
          </div>
        )}

        <table className="data-table assignment-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Class</th>
              <th>Hours/Week</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classSubjects.map((cs) => {
              const isEditing = editingClassSubjectId === cs.id
              return (
                <tr key={cs.id}>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input"
                        value={classSubjectDraft.catalogId}
                        onChange={(e) =>
                          setClassSubjectDraft({ ...classSubjectDraft, catalogId: e.target.value })
                        }
                      >
                        {subjectCatalog.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      cs.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="table-input"
                        value={classSubjectDraft.classId}
                        onChange={(e) =>
                          setClassSubjectDraft({ ...classSubjectDraft, classId: e.target.value })
                        }
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {formatClassLabel(c)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      formatClassLabel(classes.find((c) => c.id === cs.classId) || { name: '—' })
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="40"
                        className="table-input hours-input"
                        value={classSubjectDraft.hoursPerWeek}
                        onChange={(e) =>
                          setClassSubjectDraft({
                            ...classSubjectDraft,
                            hoursPerWeek: e.target.value,
                          })
                        }
                      />
                    ) : (
                      cs.hoursPerWeek
                    )}
                  </td>
                  <td>
                    <RowActions
                      isEditing={isEditing}
                      onEdit={() => startClassSubjectEdit(cs)}
                      onSave={saveClassSubjectEdit}
                      onCancel={cancelClassSubjectEdit}
                      onDelete={() => removeClassSubject(cs.id)}
                    />
                  </td>
                </tr>
              )
            })}
            {classSubjects.length === 0 && (
              <tr>
                <td colSpan="4" className="empty">
                  No subject-class hours yet. Add a subject and class above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="form-container">
        <h2>Assign teachers</h2>
        <p className="form-help">
          Choose who teaches each subject-class. Hours come from the table above, not from the teacher assignment.
        </p>

        {unassignedOfferings.length > 0 && (
          <div className="warnings">
            <p>{unassignedOfferings.length} subject-class offering(s) still need a teacher.</p>
          </div>
        )}

        <div className="form-row">
          <select value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)}>
            <option value="">Select subject-class...</option>
            {classSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {getClassSubjectLabel(cs, classes, formatClassLabel)} ({cs.hoursPerWeek} hrs/wk)
              </option>
            ))}
          </select>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Select teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-small"
            onClick={addAssignment}
            disabled={!classSubjectId || !teacherId || classSubjects.length === 0}
          >
            Assign teacher
          </button>
        </div>

        <table className="data-table assignment-table">
          <thead>
            <tr>
              <th>Subject — Class</th>
              <th>Hours/Week</th>
              <th>Teacher</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const offering = classSubjects.find((cs) => cs.id === assignment.classSubjectId)
              if (!offering) return null
              return (
                <tr key={assignment.id}>
                  <td>{getClassSubjectLabel(offering, classes, formatClassLabel)}</td>
                  <td>{offering.hoursPerWeek}</td>
                  <td>
                    <select
                      className="table-input"
                      value={assignment.teacherId}
                      onChange={(e) => updateAssignmentTeacher(assignment.id, e.target.value)}
                      aria-label={`Teacher for ${offering.name}`}
                    >
                      {teachers.map((t) => (
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
                      onClick={() => removeAssignment(assignment.id)}
                      title="Remove teacher assignment"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
            {assignments.length === 0 && (
              <tr>
                <td colSpan="4" className="empty">
                  No teachers assigned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
