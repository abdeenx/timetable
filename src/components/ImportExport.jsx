import { useRef, useState } from 'react'
import {
  downloadTemplate,
  downloadCurrentData,
  parseExcelFile,
  readFileAsArrayBuffer,
} from '../utils/excel'
import { downloadBackup, parseBackup, readFileAsText } from '../utils/backup'

export default function ImportExport({
  classes,
  teachers,
  subjectCatalog,
  breaks,
  backupState,
  onImport,
  onRestore,
  onError,
  onReset,
}) {
  const fileInputRef = useRef(null)
  const backupInputRef = useRef(null)
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

  const handleExportBackup = () => {
    setWarnings([])
    onError('')
    try {
      downloadBackup(backupState)
      setStatus({ type: 'success', message: 'Full backup downloaded (all data, including assignments and settings).' })
    } catch {
      setStatus({ type: 'error', message: 'Could not create the backup file.' })
    }
  }

  const handleBackupFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setStatus(null)
    setWarnings([])
    onError('')

    if (!file.name.match(/\.json$/i)) {
      setStatus({ type: 'error', message: 'Please upload a backup file (.json).' })
      return
    }

    if (hasData) {
      const replace = confirm(
        'Restoring a backup will replace ALL current data (classes, teachers, subjects, assignments, and settings). Continue?',
      )
      if (!replace) return
    }

    try {
      const text = await readFileAsText(file)
      const restored = parseBackup(text)
      onRestore(restored)
      setStatus({ type: 'success', message: 'Backup restored. All data and settings were replaced.' })
    } catch (e) {
      setStatus({
        type: 'error',
        message: e?.message || 'Could not read the backup file. Check the format and try again.',
      })
    }
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
        gradeSubjects: result.gradeSubjects,
        assignments: result.assignments,
        classes: result.classes,
        teachers: result.teachers,
        breaks: result.breaks,
      })

      setWarnings(result.warnings)
      setStatus({
        type: 'success',
        message: `Imported ${result.classes.length} classes, ${result.teachers.length} teachers, and ${result.subjectCatalog.length} subjects. Set lessons and assign teachers in Setup.`,
      })
    } catch {
      setStatus({
        type: 'error',
        message: 'Could not read the Excel file. Check the format and try again.',
      })
    }
  }

  return (
    <details className="form-container excel-panel">
      <summary>Import / export</summary>
      <p className="form-help">
        Import classes, teachers, and subjects from a spreadsheet, export the lists back
        out, or move everything — including assignments and settings — between devices.
      </p>

      <div className="excel-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          Import spreadsheet
        </button>
        <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
          Download template
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleDownloadData}
          disabled={!hasData}
          title={hasData ? 'Export classes, teachers, and subjects to Excel' : 'Add data first to export'}
        >
          Export spreadsheet
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="excel-file-input"
          onChange={handleFileChange}
        />
      </div>

      <div className="excel-actions" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleExportBackup}
          disabled={!hasData}
          title={hasData ? 'Export all data to a backup file' : 'Add data first to export'}
        >
          Export full backup
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => backupInputRef.current?.click()}
        >
          Restore from backup
        </button>
        <input
          ref={backupInputRef}
          type="file"
          accept=".json,application/json"
          className="excel-file-input"
          onChange={handleBackupFileChange}
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

      {onReset && hasData && (
        <div className="excel-danger">
          <h3>Danger zone</h3>
          <p className="form-help">
            Delete every class, teacher, subject, assignment, and setting on this device.
            This cannot be undone — download a full backup first.
          </p>
          <button type="button" className="btn-danger-solid" onClick={onReset}>
            Delete all data
          </button>
        </div>
      )}
    </details>
  )
}
