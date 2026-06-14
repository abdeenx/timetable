import { useState } from 'react'

export default function SubjectForm({ subjects, teachers, classes, onChange }) {
  const [name, setName] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(3)
  const [teacherId, setTeacherId] = useState('')
  const [classId, setClassId] = useState('')

  const addSubject = () => {
    if (!name.trim()) return
    const newSubject = {
      id: Date.now().toString(),
      name: name.trim(),
      hoursPerWeek: parseInt(hoursPerWeek),
      teacherId: teacherId || null,
      classId: classId || null,
    }
    onChange([...subjects, newSubject])
    setName('')
    setHoursPerWeek(3)
    setTeacherId('')
    setClassId('')
  }

  const removeSubject = (id) => {
    onChange(subjects.filter(s => s.id !== id))
  }

  const selectedClass = classes.find(c => c.id === classId)
  const classSubjects = subjects.filter(s => s.classId === classId)

  return (
    <div className="form-container">
      <h2>Subjects</h2>
      <p className="form-help">Add subjects — each belongs to one class, taught by one teacher, with weekly hours.</p>
      
      <div className="form-row">
        <input
          type="text"
          placeholder="Subject name (e.g. Mathematics)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSubject()}
        />
        <select value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">Select class...</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
          <option value="">Select teacher...</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="40"
          value={hoursPerWeek}
          onChange={e => setHoursPerWeek(e.target.value)}
          style={{ width: '90px' }}
          title="Hours per week"
        />
        <span className="label">hrs/wk</span>
        <button className="btn-small" onClick={addSubject}>Add</button>
      </div>

      {classId && selectedClass && (
        <div className="class-summary">
          <strong>{selectedClass.name}</strong>: {classSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0)} hrs/week assigned
          {classSubjects.length > 0 && ` (${classSubjects.map(s => s.name).join(', ')})`}
        </div>
      )}

      <table className="data-table">
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
          {subjects.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{classes.find(c => c.id === s.classId)?.name || '—'}</td>
              <td>{teachers.find(t => t.id === s.teacherId)?.name || '—'}</td>
              <td>{s.hoursPerWeek}</td>
              <td><button className="btn-danger" onClick={() => removeSubject(s.id)}>×</button></td>
            </tr>
          ))}
          {subjects.length === 0 && (
            <tr><td colSpan="5" className="empty">No subjects added yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
