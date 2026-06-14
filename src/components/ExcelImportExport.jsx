import { useRef, useState } from 'react'
import {
  downloadTemplate,
  downloadCurrentData,
  parseExcelFile,
  readFileAsArrayBuffer,
} from '../utils/excel'

export default function ExcelImportExport({
  classes,
  teachers,
  subjects,
  onImport,
  onError,
}) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [warnings, setWarnings] = useState([])

  const hasData = classes.length > 0 || teachers.length > 0 || subjects.length > 0

  const handleDownloadTemplate = () => {
    downloadTemplate()
    setStatus({ type: 'success', message: 'Blank template downloaded.' })
  }

  const handleDownloadData = () => {
    downloadCurrentData(classes, teachers, subjects)
    setStatus({ type: 'success', message: 'Current data exported to Excel.' })
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setStatus(null)
    setWarnings([])
    onError('')

    if (!file.name.match(/\.xlsx?$/i)) {
      setStatus({ type: 'error', message: 'Please upload an Excel file (.xlsx or .xls).' })
      return
    }

    if (hasData) {
      const replace = confirm(
        'Importing will replace all current classes, teachers, and subjects. Continue?',
      )
      if (!replace) return
    }

    try {
      const buffer = await readFileAsArrayBuffer(file)
      const result = parseExcelFile(buffer)

      if (result.errors.length > 0) {
        setStatus({
          type: 'error',
          message: result.errors.join(' '),
        })
        return
      }

      onImport({
        classes: result.classes,
        teachers: result.teachers,
        subjects: result.subjects,
      })

      setWarnings(result.warnings)
      setStatus({
        type: 'success',
        message: `Imported ${result.classes.length} classes, ${result.teachers.length} teachers, and ${result.subjects.length} subjects.`,
      })
    } catch {
      setStatus({ type: 'error', message: 'Could not read the Excel file. Check the format and try again.' })
    }
  }

  return (
    <div className="form-container excel-panel">
      <h2>Excel import / export</h2>
      <p className="form-help">
        Download our template, fill in the Classes, Teachers, and Subjects sheets, then upload
        to prefill everything at once.
      </p>

      <div className="excel-actions">
        <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
          Download blank template
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleDownloadData}
          disabled={!hasData}
          title={hasData ? 'Export current data to Excel' : 'Add data first to export'}
        >
          Export current data
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload filled Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="excel-file-input"
          onChange={handleFileChange}
        />
      </div>

      {status && (
        <div className={`excel-status excel-status-${status.type}`} role="status">
          {status.message}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warnings excel-warnings">
          <strong>Import notes</strong>
          {warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}
