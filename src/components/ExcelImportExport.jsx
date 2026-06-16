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
  subjectCatalog,
  breaks,
  onImport,
  onError,
}) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [warnings, setWarnings] = useState([])

  const hasData =
    classes.length > 0 || teachers.length > 0 || subjectCatalog.length > 0

  const handleDownloadTemplate = () => {
    downloadTemplate()
    setStatus({ type: 'success', message: 'Blank template downloaded.' })
  }

  const handleDownloadData = () => {
    downloadCurrentData(classes, teachers, subjectCatalog, breaks)
    setStatus({ type: 'success', message: 'Lists exported to Excel. Assignments stay in the app.' })
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
        'Importing will replace your class, teacher, and subject lists. Existing assignments will be cleared. Continue?',
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
        subjectCatalog: result.subjectCatalog,
        classSubjects: result.classSubjects,
        assignments: result.assignments,
        classes: result.classes,
        teachers: result.teachers,
        breaks: result.breaks,
      })

      setWarnings(result.warnings)
      setStatus({
        type: 'success',
        message: `Imported ${result.classes.length} classes, ${result.teachers.length} teachers, and ${result.subjectCatalog.length} subjects. Set periods and assign teachers on the Subjects tab.`,
      })
    } catch {
      setStatus({
        type: 'error',
        message: 'Could not read the Excel file. Check the format and try again.',
      })
    }
  }

  return (
    <div className="form-container excel-panel">
      <h2>Excel import / export</h2>
      <p className="form-help">
        Download the template and fill in three separate lists: classes, teachers, and subject names.
        After upload, go to the Subjects tab to set periods per class and assign teachers.
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
          title={hasData ? 'Export lists to Excel' : 'Add data first to export'}
        >
          Export lists
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
