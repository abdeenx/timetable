import { Fragment, useState } from 'react'
import { formatClassLabel } from '../utils/classes'
import { getClassSubjectLabel } from '../utils/subjects'
import RowActions from './RowActions'

export default function TeacherForm({ teachers, classSubjects, classes, onChange }) {
  const [name, setName] = useState('')
  const [maxHours, setMaxHours] = useState(30)
  const [selectedClassSubjectIds, setSelectedClassSubjectIds] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({
    name: '',
    maxHoursPerWeek: 30,
    classSubjectIds: [],
    classIds: [],
  })
  const [editError, setEditError] = useState('')

  const classSubjectOptions = classSubjects.map((cs) => ({
    id: cs.id,
    label: getClassSubjectLabel(cs, classes, formatClassLabel),
  }))

  const getTeacherClassSubjectIds = (teacher) =>
    teacher.classSubjectIds?.length ? teacher.classSubjectIds : teacher.subjectIds || []

  const addTeacher = () => {
    if (!name.trim()) return
    onChange([
      ...teachers,
      {
        id: Date.now().toString(),
        name: name.trim(),
        maxHoursPerWeek: parseInt(maxHours, 10) || 30,
        classSubjectIds: [...selectedClassSubjectIds],
        classIds: [...selectedClasses],
        subjectIds: [...selectedClassSubjectIds],
      },
    ])
    setName('')
    setMaxHours(30)
    setSelectedClassSubjectIds([])
    setSelectedClasses([])
  }

  const startEdit = (teacher) => {
    const classSubjectIds = getTeacherClassSubjectIds(teacher)
    setEditingId(teacher.id)
    setEditDraft({
      name: teacher.name,
      maxHoursPerWeek: teacher.maxHoursPerWeek,
      classSubjectIds: [...classSubjectIds],
      classIds: [...teacher.classIds],
    })
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  const saveEdit = () => {
    const trimmedName = editDraft.name.trim()
    const maxHoursValue = parseInt(editDraft.maxHoursPerWeek, 10)
    if (!trimmedName) {
      setEditError('Teacher name is required.')
      return
    }
    if (Number.isNaN(maxHoursValue) || maxHoursValue < 1) {
      setEditError('Max hours must be at least 1.')
      return
    }
    onChange(
      teachers.map((t) =>
        t.id === editingId
          ? {
              ...t,
              name: trimmedName,
              maxHoursPerWeek: maxHoursValue,
              classSubjectIds: [...editDraft.classSubjectIds],
              classIds: [...editDraft.classIds],
              subjectIds: [...editDraft.classSubjectIds],
            }
          : t,
      ),
    )
    setEditingId(null)
    setEditError('')
  }

  const removeTeacher = (id) => {
    if (editingId === id) cancelEdit()
    onChange(teachers.filter((t) => t.id !== id))
  }

  const toggleDraftClassSubject = (id) => {
    setEditDraft((prev) => ({
      ...prev,
      classSubjectIds: prev.classSubjectIds.includes(id)
        ? prev.classSubjectIds.filter((x) => x !== id)
        : [...prev.classSubjectIds, id],
    }))
  }

  const toggleDraftClass = (id) => {
    setEditDraft((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(id)
        ? prev.classIds.filter((x) => x !== id)
        : [...prev.classIds, id],
    }))
  }

  const toggleClassSubject = (id) => {
    setSelectedClassSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleClass = (id) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const renderCheckboxGroups = (
    classSubjectIds,
    classIds,
    onClassSubjectToggle,
    onClassToggle,
  ) => (
    <div className="checkbox-groups edit-checkbox-groups">
      <div className="checkbox-group">
        <strong>Teaches subject-class:</strong>
        {classSubjectOptions.length === 0 && (
          <p className="dim">Add subject-class hours on the Subjects tab first.</p>
        )}
        {classSubjectOptions.map(({ id, label }) => (
          <label key={id} className="checkbox-label">
            <input
              type="checkbox"
              checked={classSubjectIds.includes(id)}
              onChange={() => onClassSubjectToggle(id)}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="checkbox-group">
        <strong>Teaches classes:</strong>
        {classes.length === 0 && <p className="dim">No classes added yet.</p>}
        {classes.map((c) => (
          <label key={c.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={classIds.includes(c.id)}
              onChange={() => onClassToggle(c.id)}
            />
            {formatClassLabel(c)}
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="form-container">
      <h2>Teachers</h2>
      <p className="form-help">
        Add teachers and set their limits. Click Edit on any row to update name, hours, or assignments.
      </p>

      <div className="teacher-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Teacher name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            max="60"
            value={maxHours}
            onChange={(e) => setMaxHours(e.target.value)}
            style={{ width: '100px' }}
            title="Max hours per week"
          />
          <span className="label">max hrs/wk</span>
          <button type="button" className="btn-small" onClick={addTeacher}>
            Add
          </button>
        </div>

        {renderCheckboxGroups(
          selectedClassSubjectIds,
          selectedClasses,
          toggleClassSubject,
          toggleClass,
        )}
      </div>

      {editError && <p className="form-inline-error">{editError}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Teaches</th>
            <th>Classes</th>
            <th>Max hrs/wk</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => {
            const teacherClassSubjectIds = getTeacherClassSubjectIds(t)
            const teacherOfferings = classSubjects.filter((cs) =>
              teacherClassSubjectIds.includes(cs.id),
            )
            const teacherClasses = classes.filter((c) => t.classIds.includes(c.id))
            const isEditing = editingId === t.id

            return (
              <Fragment key={t.id}>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="table-input"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      />
                    ) : (
                      t.name
                    )}
                  </td>
                  <td>
                    {teacherOfferings
                      .map((cs) => getClassSubjectLabel(cs, classes, formatClassLabel))
                      .join(', ') || '—'}
                  </td>
                  <td>{teacherClasses.map((c) => formatClassLabel(c)).join(', ') || '—'}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className="table-input hours-input"
                        value={editDraft.maxHoursPerWeek}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, maxHoursPerWeek: e.target.value })
                        }
                      />
                    ) : (
                      t.maxHoursPerWeek
                    )}
                  </td>
                  <td>
                    <RowActions
                      isEditing={isEditing}
                      onEdit={() => startEdit(t)}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onDelete={() => removeTeacher(t.id)}
                    />
                  </td>
                </tr>
                {isEditing && (
                  <tr key={`${t.id}-edit`} className="edit-detail-row">
                    <td colSpan="5">
                      {renderCheckboxGroups(
                        editDraft.classSubjectIds,
                        editDraft.classIds,
                        toggleDraftClassSubject,
                        toggleDraftClass,
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
          {teachers.length === 0 && (
            <tr>
              <td colSpan="5" className="empty">
                No teachers added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
