import { useState } from 'react'

export default function ClassForm({ classes, subjects, onChange }) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')

  const addClass = () => {
    if (!name.trim()) return
    onChange([...classes, {
      id: Date.now().toString(),
      name: name.trim(),
      grade: grade.trim() || name.trim(),
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
      <p className="form-help">Add classes (e.g. "Grade 10A", "Form 3 Science"). Each class has subjects assigned to it.</p>
      
      <div className="form-row">
        <input
          type="text"
          placeholder="Class name (e.g. Grade 10A)"
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
                <td>{c.name}</td>
                <td>{c.grade}</td>
                <td>{classSubjects.map(s => s.name).join(', ') || '—'}</td>
                <td>{totalHrs}</td>
                <td><button className="btn-danger" onClick={() => removeClass(c.id)}>×</button></td>
              </tr>
            )
          })}
          {classes.length === 0 && (
            <tr><td colSpan="5" className="empty">No classes added yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
