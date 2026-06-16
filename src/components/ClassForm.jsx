import { useState } from 'react'
import { formatClassLabel, isDuplicateClass, classCompositeKey, sortClasses } from '../utils/classes'
import RowActions from './RowActions'

export default function ClassForm({ classes, gradeSubjects, onChange }) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ name: '', grade: '' })
  const [editError, setEditError] = useState('')

  const addClass = () => {
    if (!name.trim()) return
    const trimmedName = name.trim()
    const trimmedGrade = grade.trim() || trimmedName
    if (isDuplicateClass(classes, trimmedName, trimmedGrade)) return
    onChange([
      ...classes,
      {
        id: Date.now().toString(),
        name: trimmedName,
        grade: trimmedGrade,
      },
    ])
    setName('')
    setGrade('')
  }

  const startEdit = (cls) => {
    setEditingId(cls.id)
    setEditDraft({ name: cls.name, grade: cls.grade })
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  const saveEdit = () => {
    const trimmedName = editDraft.name.trim()
    const trimmedGrade = editDraft.grade.trim() || trimmedName
    if (!trimmedName) {
      setEditError('Class name is required.')
      return
    }
    const duplicate = classes.some(
      (c) =>
        c.id !== editingId &&
        classCompositeKey(c) === classCompositeKey({ name: trimmedName, grade: trimmedGrade }),
    )
    if (duplicate) {
      setEditError('A class with this name and grade already exists.')
      return
    }
    onChange(
      classes.map((c) =>
        c.id === editingId ? { ...c, name: trimmedName, grade: trimmedGrade } : c,
      ),
    )
    setEditingId(null)
    setEditError('')
  }

  const removeClass = (id) => {
    if (editingId === id) cancelEdit()
    onChange(classes.filter((c) => c.id !== id))
  }

  return (
    <div className="form-container">
      <h2>Classes</h2>
      <p className="form-help">
        Add classes with a short name (e.g. A, B) and a grade/year. The same class name can be used in different grades. Click Edit on any row to update it.
      </p>

      <div className="form-row">
        <input
          type="text"
          placeholder="Class name (e.g. A, 10A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClass()}
        />
        <input
          type="text"
          placeholder="Grade/Year (e.g. Grade 10)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClass()}
        />
        <button type="button" className="btn-small" onClick={addClass}>
          Add
        </button>
      </div>

      {editError && <p className="form-inline-error">{editError}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Display name</th>
            <th>Class</th>
            <th>Grade/Year</th>
            <th>Subjects</th>
            <th>Total periods/wk</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortClasses(classes).map((c) => {
            const offerings = (gradeSubjects || []).filter((gs) => gs.grade === c.grade)
            const totalHrs = offerings.reduce((sum, s) => sum + s.hoursPerWeek, 0)
            const isEditing = editingId === c.id

            return (
              <tr key={c.id}>
                <td>{isEditing ? formatClassLabel({ name: editDraft.name, grade: editDraft.grade }) : formatClassLabel(c)}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      className="table-input"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      className="table-input"
                      value={editDraft.grade}
                      onChange={(e) => setEditDraft({ ...editDraft, grade: e.target.value })}
                    />
                  ) : (
                    c.grade
                  )}
                </td>
                <td>{offerings.map((s) => s.name).join(', ') || '—'}</td>
                <td>{totalHrs}</td>
                <td>
                  <RowActions
                    isEditing={isEditing}
                    onEdit={() => startEdit(c)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => removeClass(c.id)}
                  />
                </td>
              </tr>
            )
          })}
          {classes.length === 0 && (
            <tr>
              <td colSpan="6" className="empty">
                No classes added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
