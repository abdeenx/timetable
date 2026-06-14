import { useState } from 'react'
import { formatClassLabel } from '../utils/classes'

function syncTeacherLinks(teachers, subjects) {
  return teachers.map((teacher) => {
    const linked = subjects.filter((s) => s.teacherId === teacher.id)
    const subjectIds = [...new Set(linked.map((s) => s.id))]
    const classIds = [...new Set(linked.map((s) => s.classId).filter(Boolean))]
    return { ...teacher, subjectIds, classIds }
  })
}

export default function SubjectForm({
  subjectCatalog,
  onCatalogChange,
  subjects,
  teachers,
  classes,
  onChange,
  onTeachersChange,
}) {
  const [catalogName, setCatalogName] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(3)
  const [teacherId, setTeacherId] = useState('')
  const [classId, setClassId] = useState('')

  const addToCatalog = () => {
    const name = catalogName.trim()
    if (!name) return
    if (subjectCatalog.some((s) => s.name.toLowerCase() === name.toLowerCase())) return
    onCatalogChange([...subjectCatalog, { id: Date.now().toString(), name }])
    setCatalogName('')
  }

  const removeFromCatalog = (id) => {
    onCatalogChange(subjectCatalog.filter((s) => s.id !== id))
    const remaining = subjects.filter((s) => s.catalogId !== id)
    onChange(remaining)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, remaining))
    }
  }

  const addAssignment = () => {
    if (!catalogId || !classId || !teacherId) return
    const entry = subjectCatalog.find((s) => s.id === catalogId)
    if (!entry) return

    const newSubject = {
      id: Date.now().toString(),
      catalogId,
      name: entry.name,
      hoursPerWeek: parseInt(hoursPerWeek, 10) || 3,
      teacherId,
      classId,
    }
    const nextSubjects = [...subjects, newSubject]
    onChange(nextSubjects)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, nextSubjects))
    }
    setCatalogId('')
    setHoursPerWeek(3)
    setTeacherId('')
    setClassId('')
  }

  const updateAssignment = (id, field, value) => {
    const nextSubjects = subjects.map((s) => {
      if (s.id !== id) return s
      if (field === 'catalogId') {
        const entry = subjectCatalog.find((c) => c.id === value)
        return { ...s, catalogId: value, name: entry?.name || s.name }
      }
      if (field === 'hoursPerWeek') {
        return { ...s, hoursPerWeek: parseInt(value, 10) || 1 }
      }
      return { ...s, [field]: value || null }
    })
    onChange(nextSubjects)
    if (onTeachersChange && (field === 'teacherId' || field === 'classId')) {
      onTeachersChange(syncTeacherLinks(teachers, nextSubjects))
    }
  }

  const removeAssignment = (id) => {
    const nextSubjects = subjects.filter((s) => s.id !== id)
    onChange(nextSubjects)
    if (onTeachersChange) {
      onTeachersChange(syncTeacherLinks(teachers, nextSubjects))
    }
  }

  const selectedClass = classes.find((c) => c.id === classId)
  const classSubjects = subjects.filter((s) => s.classId === classId)
  const unassignedCount = subjects.filter((s) => !s.classId || !s.teacherId).length

  return (
    <>
      <div className="form-container">
        <h2>Subject list</h2>
        <p className="form-help">
          Subject names only — import from Excel or add here. Assign them to classes and teachers below.
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

        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subjectCatalog.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  <button type="button" className="btn-danger" onClick={() => removeFromCatalog(s.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
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
        <h2>Assign to classes</h2>
        <p className="form-help">
          Link each subject to a class and teacher. You need at least one assignment before generating a timetable.
        </p>

        {unassignedCount > 0 && (
          <div className="warnings">
            <p>{unassignedCount} assignment(s) still need a class or teacher.</p>
          </div>
        )}

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
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Select teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
            title="Hours per week"
          />
          <span className="label">hrs/wk</span>
          <button
            type="button"
            className="btn-small"
            onClick={addAssignment}
            disabled={!catalogId || !classId || !teacherId || subjectCatalog.length === 0}
          >
            Add assignment
          </button>
        </div>

        {classId && selectedClass && (
          <div className="class-summary">
            <strong>{formatClassLabel(selectedClass)}</strong>:{' '}
            {classSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0)} hrs/week assigned
            {classSubjects.length > 0 && ` (${classSubjects.map((s) => s.name).join(', ')})`}
          </div>
        )}

        <table className="data-table assignment-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Hours/Week</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className={!s.classId || !s.teacherId ? 'row-incomplete' : ''}>
                <td>
                  <select
                    value={s.catalogId || ''}
                    onChange={(e) => updateAssignment(s.id, 'catalogId', e.target.value)}
                    aria-label={`Subject for ${s.name}`}
                  >
                    <option value="">Select...</option>
                    {subjectCatalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={s.classId || ''}
                    onChange={(e) => updateAssignment(s.id, 'classId', e.target.value)}
                    aria-label={`Class for ${s.name}`}
                  >
                    <option value="">Select...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {formatClassLabel(c)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={s.teacherId || ''}
                    onChange={(e) => updateAssignment(s.id, 'teacherId', e.target.value)}
                    aria-label={`Teacher for ${s.name}`}
                  >
                    <option value="">Select...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={s.hoursPerWeek}
                    onChange={(e) => updateAssignment(s.id, 'hoursPerWeek', e.target.value)}
                    className="hours-input"
                    aria-label={`Hours per week for ${s.name}`}
                  />
                </td>
                <td>
                  <button type="button" className="btn-danger" onClick={() => removeAssignment(s.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No assignments yet. Pick a subject, class, and teacher above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
