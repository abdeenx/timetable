export default function SiteSettings({
  periodsPerDay,
  onPeriodsPerDayChange,
  fixedSlots = [],
  onFixedSlotsChange,
  subjectCatalog = [],
  teachers = [],
  days = [],
}) {
  const sortedCatalog = [...subjectCatalog].sort((a, b) => a.name.localeCompare(b.name))
  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name))

  const addFixedSlot = () => {
    if (sortedCatalog.length === 0 || days.length === 0) return
    onFixedSlotsChange?.([
      ...fixedSlots,
      {
        id: Date.now().toString(),
        day: days[0],
        period: 1,
        catalogId: sortedCatalog[0].id,
        teacherId: null,
      },
    ])
  }

  const updateFixedSlot = (id, patch) => {
    onFixedSlotsChange?.(fixedSlots.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const removeFixedSlot = (id) => {
    onFixedSlotsChange?.(fixedSlots.filter((f) => f.id !== id))
  }

  return (
    <div className="form-container">
      <h2>Site Settings</h2>
      <p className="form-help">
        Configure how many lessons each day has, and optionally pin a subject to a fixed
        lesson on a specific day (e.g. always start Monday with Mathematics).
      </p>

      <div className="form-row" style={{ marginTop: 10 }}>
        <label className="label" htmlFor="periods-per-day">
          Lessons per day
        </label>
        <input
          id="periods-per-day"
          type="number"
          min="1"
          max="16"
          value={periodsPerDay}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10)
            const safe = Number.isFinite(next) ? Math.min(16, Math.max(1, next)) : 8
            onPeriodsPerDayChange?.(safe)
          }}
          style={{ width: '110px' }}
        />
      </div>

      <h3 style={{ marginTop: 24 }}>Fixed lessons</h3>
      <p className="form-help">
        A fixed lesson reserves that slot for the chosen subject in every class whose grade
        includes the subject. Pick which lesson of the day it occupies, and optionally a
        specific teacher — otherwise each class's assigned teacher is used. Re-generate the
        timetable to apply changes.
      </p>

      <div className="form-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={addFixedSlot}
          disabled={sortedCatalog.length === 0 || days.length === 0}
        >
          Add fixed lesson
        </button>
        {sortedCatalog.length === 0 && (
          <span className="label">Add subjects on the Subjects tab first.</span>
        )}
      </div>

      {fixedSlots.length > 0 && (
        <table className="data-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Lesson</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fixedSlots.map((f) => {
              const dayOptions = days.includes(f.day) ? days : [f.day, ...days]
              const subjectExists = sortedCatalog.some((s) => s.id === f.catalogId)
              const teacherExists = !f.teacherId || sortedTeachers.some((t) => t.id === f.teacherId)
              return (
                <tr key={f.id}>
                  <td>
                    <select
                      className="table-input"
                      value={f.day}
                      onChange={(e) => updateFixedSlot(f.id, { day: e.target.value })}
                      style={{ maxWidth: 180 }}
                    >
                      {dayOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={Math.min(f.period, periodsPerDay)}
                      onChange={(e) => updateFixedSlot(f.id, { period: parseInt(e.target.value, 10) })}
                      style={{ maxWidth: 120 }}
                    >
                      {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={subjectExists ? f.catalogId : ''}
                      onChange={(e) => updateFixedSlot(f.id, { catalogId: e.target.value })}
                      style={{ maxWidth: 220 }}
                    >
                      {!subjectExists && <option value="">— removed subject —</option>}
                      {sortedCatalog.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={teacherExists ? f.teacherId || '' : '__missing__'}
                      onChange={(e) =>
                        updateFixedSlot(f.id, { teacherId: e.target.value || null })
                      }
                      style={{ maxWidth: 220 }}
                    >
                      {!teacherExists && <option value="__missing__">— removed teacher —</option>}
                      <option value="">Assigned teacher (default)</option>
                      {sortedTeachers.map((t) => (
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
                      onClick={() => removeFixedSlot(f.id)}
                      title="Remove fixed lesson"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {fixedSlots.length === 0 && (
        <div className="empty-state">No fixed lessons yet.</div>
      )}
    </div>
  )
}
