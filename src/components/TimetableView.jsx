export default function TimetableView({ timetable, days, periods }) {
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

  return (
    <div className="form-container">
      <h2>Timetable</h2>
      
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
            const csv = timetableToCSV(schedule, days, periods)
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
                {Array.from({ length: periods }, (_, p) => (
                  <tr key={p}>
                    <td className="period-num">Period {p + 1}</td>
                    {days.map(d => {
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
                ))}
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

function timetableToCSV(schedule, days, periods) {
  let csv = 'Class,Day,Period,Subject,Teacher\n'
  for (const [cl, days] of Object.entries(schedule)) {
    for (const [day, periods] of Object.entries(days)) {
      for (let p = 0; p < periods.length; p++) {
        const cell = periods[p]
        if (cell) {
          csv += `"${cl}","${day}","${p + 1}","${cell.subject}","${cell.teacher}"\n`
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
