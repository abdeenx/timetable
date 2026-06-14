import { useState } from 'react'
import { formatClassLabel, isDuplicateClass } from '../utils/classes'

export default function ClassForm({ classes, subjects, onChange }) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')

  const addClass = () => {
    if (!name.trim()) return
    const trimmedName = name.trim()
    const trimmedGrade = grade.trim() || trimmedName
    if (isDuplicateClass(classes, trimmedName, trimmedGrade)) return
    onChange([...classes, {
      id: Date.now().toString(),
      name: trimmedName,
      grade: trimmedGrade,
    }])
    setName('')
    setGrade('')
  }

  const removeClass = (id) => {
    onChange(classes.filter(c => c.id !== id))
  }

  return (
    <div className="form-container">
      <h2>Classes</h2>
      <p className="form-help">
        Add classes with a short name (e.g. A, B) and a grade/year. The same class name can be used in different grades.
      </p>
      
      <div className="form-row">
        <input
          type="text"
          placeholder="Class name (e.g. A, 10A)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addClass()}
        />
        <input
          type="text"
          placeholder="Grade/Year (e.g. Grade 10)"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addClass()}
        />
        <button className="btn-small" onClick={addClass}>Add</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Display name</th>
            <th>Class</th>
            <th>Grade/Year</th>
            <th>Subjects</th>
            <th>Total hrs/wk</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {classes.map(c => {
            const classSubjects = subjects.filter(s => s.classId === c.id)
            const totalHrs = classSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0)
            return (
              <tr key={c.id}>
                <td>{formatClassLabel(c)}</td>
                <td>{c.name}</td>
                <td>{c.grade}</td>
                <td>{classSubjects.map(s => s.name).join(', ') || '—'}</td>
                <td>{totalHrs}</td>
                <td><button className="btn-danger" onClick={() => removeClass(c.id)}>×</button></td>
              </tr>
            )
          })}
          {classes.length === 0 && (
            <tr><td colSpan="6" className="empty">No classes added yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
