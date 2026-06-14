import { useState } from 'react'

export default function TeacherForm({ teachers, subjects, classes, onChange }) {
  const [name, setName] = useState('')
  const [maxHours, setMaxHours] = useState(30)
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])

  const addTeacher = () => {
    if (!name.trim()) return
    onChange([...teachers, {
      id: Date.now().toString(),
      name: name.trim(),
      maxHoursPerWeek: parseInt(maxHours),
      subjectIds: [...selectedSubjects],
      classIds: [...selectedClasses],
    }])
    setName('')
    setMaxHours(30)
    setSelectedSubjects([])
    setSelectedClasses([])
  }

  const removeTeacher = (id) => {
    onChange(teachers.filter(t => t.id !== id))
  }

  const toggleSubject = (id) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleClass = (id) => {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="form-container">
      <h2>Teachers</h2>
      <p className="form-help">Add teachers — assign which subjects they teach, which classes they handle, and their maximum weekly hours.</p>
      
      <div className="teacher-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Teacher name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            max="60"
            value={maxHours}
            onChange={e => setMaxHours(e.target.value)}
            style={{ width: '100px' }}
            title="Max hours per week"
          />
          <span className="label">max hrs/wk</span>
          <button className="btn-small" onClick={addTeacher}>Add</button>
        </div>

        <div className="checkbox-groups">
          <div className="checkbox-group">
            <strong>Teaches subjects:</strong>
            {subjects.length === 0 && <p className="dim">No subjects added yet.</p>}
            {[...new Set(subjects.map(s => s.name))].map((subjName, i) => {
              const subj = subjects.find(s => s.name === subjName)
              return (
                <label key={i} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subj?.id)}
                    onChange={() => subj && toggleSubject(subj.id)}
                  />
                  {subjName}
                </label>
              )
            })}
          </div>
          <div className="checkbox-group">
            <strong>Teaches classes:</strong>
            {classes.length === 0 && <p className="dim">No classes added yet.</p>}
            {classes.map(c => (
              <label key={c.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Teaches</th>
            <th>Classes</th>
            <th>Max hrs/wk</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(t => {
            const teacherSubjects = subjects.filter(s => t.subjectIds.includes(s.id))
            const teacherClasses = classes.filter(c => t.classIds.includes(c.id))
            return (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{teacherSubjects.map(s => s.name).join(', ') || '—'}</td>
                <td>{teacherClasses.map(c => c.name).join(', ') || '—'}</td>
                <td>{t.maxHoursPerWeek}</td>
                <td><button className="btn-danger" onClick={() => removeTeacher(t.id)}>×</button></td>
              </tr>
            )
          })}
          {teachers.length === 0 && (
            <tr><td colSpan="5" className="empty">No teachers added yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
