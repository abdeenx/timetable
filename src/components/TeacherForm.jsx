import { Fragment, useState } from 'react'
import { formatClassLabel } from '../utils/classes'
import RowActions from './RowActions'

export default function TeacherForm({ teachers, subjectCatalog, classes, onChange }) {
  const [name, setName] = useState('')
  const [maxHours, setMaxHours] = useState(30)
  const [selectedSubjectCatalogIds, setSelectedSubjectCatalogIds] = useState([])
  const [selectedAvailableGrades, setSelectedAvailableGrades] = useState([])
  const [selectedAvailableClasses, setSelectedAvailableClasses] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({
    name: '',
    maxHoursPerWeek: 30,
    subjectCatalogIds: [],
    availableGrades: [],
    availableClassIds: [],
  })
  const [editError, setEditError] = useState('')

  const gradeOptions = [...new Set(classes.map((c) => c.grade).filter(Boolean))].sort()
  const subjectOptions = (subjectCatalog || []).map((s) => ({ id: s.id, name: s.name }))

  const addTeacher = () => {
    if (!name.trim()) return
    onChange([
      ...teachers,
      {
        id: Date.now().toString(),
        name: name.trim(),
        maxHoursPerWeek: parseInt(maxHours, 10) || 30,
        subjectCatalogIds: [...selectedSubjectCatalogIds],
        availableGrades: [...selectedAvailableGrades],
        availableClassIds: [...selectedAvailableClasses],
      },
    ])
    setName('')
    setMaxHours(30)
    setSelectedSubjectCatalogIds([])
    setSelectedAvailableGrades([])
    setSelectedAvailableClasses([])
  }

  const startEdit = (teacher) => {
    setEditingId(teacher.id)
    setEditDraft({
      name: teacher.name,
      maxHoursPerWeek: teacher.maxHoursPerWeek,
      subjectCatalogIds: [...(teacher.subjectCatalogIds || [])],
      availableGrades: [...(teacher.availableGrades || [])],
      availableClassIds: [...(teacher.availableClassIds || teacher.classIds || [])],
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
              subjectCatalogIds: [...editDraft.subjectCatalogIds],
              availableGrades: [...editDraft.availableGrades],
              availableClassIds: [...editDraft.availableClassIds],
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

  const toggleDraftSubject = (id) => {
    setEditDraft((prev) => ({
      ...prev,
      subjectCatalogIds: prev.subjectCatalogIds.includes(id)
        ? prev.subjectCatalogIds.filter((x) => x !== id)
        : [...prev.subjectCatalogIds, id],
    }))
  }

  const toggleDraftGrade = (grade) => {
    setEditDraft((prev) => ({
      ...prev,
      availableGrades: prev.availableGrades.includes(grade)
        ? prev.availableGrades.filter((x) => x !== grade)
        : [...prev.availableGrades, grade],
    }))
  }

  const toggleDraftClass = (id) => {
    setEditDraft((prev) => ({
      ...prev,
      availableClassIds: prev.availableClassIds.includes(id)
        ? prev.availableClassIds.filter((x) => x !== id)
        : [...prev.availableClassIds, id],
    }))
  }

  const toggleSubject = (id) => {
    setSelectedSubjectCatalogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleGrade = (grade) => {
    setSelectedAvailableGrades((prev) =>
      prev.includes(grade) ? prev.filter((x) => x !== grade) : [...prev, grade],
    )
  }

  const toggleClass = (id) => {
    setSelectedAvailableClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const renderCheckboxGroups = (
    subjectCatalogIds,
    availableGrades,
    availableClassIds,
    onSubjectToggle,
    onGradeToggle,
    onClassToggle,
  ) => (
    <div className="checkbox-groups edit-checkbox-groups">
      <div className="checkbox-group">
        <strong>Teaches subjects:</strong>
        {subjectOptions.length === 0 && <p className="dim">No subjects in list yet.</p>}
        {subjectOptions.map(({ id, name: subjName }) => (
          <label key={id} className="checkbox-label">
            <input
              type="checkbox"
              checked={subjectCatalogIds.includes(id)}
              onChange={() => onSubjectToggle(id)}
            />
            {subjName}
          </label>
        ))}
      </div>
      <div className="checkbox-group">
        <strong>Available grades:</strong>
        {gradeOptions.length === 0 && <p className="dim">No grades yet (add classes first).</p>}
        {gradeOptions.map((g) => (
          <label key={g} className="checkbox-label">
            <input
              type="checkbox"
              checked={availableGrades.includes(g)}
              onChange={() => onGradeToggle(g)}
            />
            {g}
          </label>
        ))}
      </div>
      <div className="checkbox-group">
        <strong>Available classes:</strong>
        {classes.length === 0 && <p className="dim">No classes added yet.</p>}
        {classes.map((c) => (
          <label key={c.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={availableClassIds.includes(c.id)}
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
            title="Max periods per week"
          />
          <span className="label">max periods/wk</span>
          <button type="button" className="btn-small" onClick={addTeacher}>
            Add
          </button>
        </div>

        {renderCheckboxGroups(
          selectedSubjectCatalogIds,
          selectedAvailableGrades,
          selectedAvailableClasses,
          toggleSubject,
          toggleGrade,
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
            <th>Max periods/wk</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => {
            const teacherSubjects = (t.subjectCatalogIds || [])
              .map((id) => subjectCatalog.find((s) => s.id === id)?.name)
              .filter(Boolean)
            const teacherGrades = t.availableGrades || []
            const teacherClasses = classes.filter((c) =>
              (t.availableClassIds || t.classIds || []).includes(c.id),
            )
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
                    {teacherSubjects.join(', ') || '—'}
                    {teacherGrades.length > 0 ? ` (Grades: ${teacherGrades.join(', ')})` : ''}
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
                        editDraft.subjectCatalogIds,
                        editDraft.availableGrades,
                        editDraft.availableClassIds,
                        toggleDraftSubject,
                        toggleDraftGrade,
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
