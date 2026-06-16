import { Fragment } from 'react'

export default function TimetableView({
  timetable,
  days,
  periods,
  periodDurationMinutes = 45,
  onPeriodDurationMinutesChange,
  breaks = [],
  onBreaksChange,
}) {
  if (!timetable) {
    return (
      <div className="form-container">
        <h2>Timetable</h2>
        <p className="form-help">Add subjects, classes, and teachers — then click "Generate Timetable".</p>
        <div className="empty-state">📅 No timetable generated yet.</div>
      </div>
    )
  }

  const { schedule, warnings } = timetable
  const normalizedBreaks = [...(breaks || [])]
    .filter((b) => Number.isFinite(parseInt(b.afterPeriod, 10)))
    .map((b) => ({
      ...b,
      afterPeriod: parseInt(b.afterPeriod, 10),
      durationMinutes: parseInt(b.durationMinutes, 10),
    }))
    .filter((b) => b.afterPeriod >= 1 && b.afterPeriod <= periods - 1)
    .sort((a, b) => a.afterPeriod - b.afterPeriod)

  const addBreak = () => {
    const next = [
      ...normalizedBreaks,
      {
        id: Date.now().toString(),
        label: 'Break',
        durationMinutes: 15,
        afterPeriod: Math.min(2, periods - 1),
      },
    ]
    onBreaksChange?.(next)
  }

  const updateBreak = (id, patch) => {
    const next = normalizedBreaks.map((b) => (b.id === id ? { ...b, ...patch } : b))
    onBreaksChange?.(next)
  }

  const removeBreak = (id) => {
    onBreaksChange?.(normalizedBreaks.filter((b) => b.id !== id))
  }

  return (
    <div className="form-container">
      <h2>Timetable</h2>

      <div className="form-row" style={{ marginTop: 10 }}>
        <label className="label" htmlFor="period-duration">
          Period duration
        </label>
        <input
          id="period-duration"
          type="number"
          min="1"
          max="240"
          value={periodDurationMinutes}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10)
            const safe = Number.isFinite(next) && next > 0 ? next : 45
            onPeriodDurationMinutesChange?.(safe)
          }}
          style={{ width: '110px' }}
        />
        <span className="label">minutes</span>
      </div>

      <div className="form-row" style={{ marginTop: 6 }}>
        <span className="label" style={{ minWidth: 120 }}>
          Breaks
        </span>
        <button type="button" className="btn-secondary" onClick={addBreak}>
          Add break
        </button>
      </div>

      {normalizedBreaks.length > 0 && (
        <table className="data-table" style={{ marginTop: 8, marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Label</th>
              <th>Duration (min)</th>
              <th>Between periods</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {normalizedBreaks.map((b) => (
              <tr key={b.id}>
                <td>
                  <input
                    className="table-input"
                    value={b.label || ''}
                    onChange={(e) => updateBreak(b.id, { label: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="table-input"
                    type="number"
                    min="1"
                    max="240"
                    value={Number.isFinite(b.durationMinutes) ? b.durationMinutes : 15}
                    onChange={(e) => updateBreak(b.id, { durationMinutes: parseInt(e.target.value, 10) })}
                    style={{ maxWidth: 140 }}
                  />
                </td>
                <td>
                  <select
                    className="table-input"
                    value={b.afterPeriod}
                    onChange={(e) => updateBreak(b.id, { afterPeriod: parseInt(e.target.value, 10) })}
                    style={{ maxWidth: 180 }}
                  >
                    {Array.from({ length: Math.max(0, periods - 1) }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        {p}-{p + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button type="button" className="btn-danger" onClick={() => removeBreak(b.id)} title="Remove break">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {warnings && warnings.length > 0 && (
        <div className="warnings">
          <strong>⚠️ Warnings:</strong>
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="timetable-print">
        <button className="btn-secondary" onClick={() => window.print()}>
          🖨️ Print Timetable
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            const csv = timetableToCSV(schedule, days, periods, normalizedBreaks)
            downloadCSV(csv)
          }}
        >
          📥 Download CSV
        </button>
      </div>

      {Object.keys(schedule).sort().map(className => (
        <div key={className} className="class-timetable">
          <h3>{className}</h3>
          <div className="table-scroll">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th>Time</th>
                  {days.map(d => <th key={d}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periods }, (_, p) => {
                  const afterPeriod = p + 1
                  const breakAfter = normalizedBreaks.filter((b) => b.afterPeriod === afterPeriod)
                  return (
                    <Fragment key={`p-${p}`}>
                      <tr>
                        <td className="period-num">
                          Period {p + 1} ({periodDurationMinutes}m)
                        </td>
                        {days.map((d) => {
                          const cell = schedule[className]?.[d]?.[p]
                          return (
                            <td key={d} className={cell ? 'has-class' : ''}>
                              {cell ? (
                                <>
                                  <div className="cell-subject">{cell.subject}</div>
                                  <div className="cell-teacher">{cell.teacher}</div>
                                </>
                              ) : cell === '' ? '' : null}
                            </td>
                          )
                        })}
                      </tr>
                      {breakAfter.map((b) => (
                        <tr key={`break-${b.id}`} className="break-row">
                          <td className="break-cell break-label">
                            {b.label} ({b.durationMinutes}m)
                          </td>
                          {days.map((d) => (
                            <td key={d} className="break-cell">
                              {b.label}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(schedule).length === 0 && (
        <div className="empty-state">No timetable generated. Add data and try again.</div>
      )}
    </div>
  )
}

function timetableToCSV(schedule, days, periods, breaks) {
  let csv = 'Class,Day,Period,Subject,Teacher\n'
  const byAfterPeriod = new Map()
  for (const b of breaks || []) {
    const key = parseInt(b.afterPeriod, 10)
    if (!Number.isFinite(key)) continue
    byAfterPeriod.set(key, [...(byAfterPeriod.get(key) || []), b])
  }
  for (const [cl, days] of Object.entries(schedule)) {
    for (const [day, periods] of Object.entries(days)) {
      for (let p = 0; p < periods.length; p++) {
        const cell = periods[p]
        if (cell) {
          csv += `"${cl}","${day}","${p + 1}","${cell.subject}","${cell.teacher}"\n`
        }
        const breakAfter = byAfterPeriod.get(p + 1) || []
        for (const b of breakAfter) {
          csv += `"${cl}","${day}","Break after ${p + 1}","${b.label} (${b.durationMinutes}m)",""\n`
        }
      }
    }
  }
  return csv
}

function downloadCSV(csv) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'timetable.csv'
  a.click()
  URL.revokeObjectURL(url)
}
