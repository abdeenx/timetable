import { useRef, useState } from 'react'
import {
  downloadTemplate,
  downloadCurrentData,
  parseExcelFile,
  readFileAsArrayBuffer,
} from '../utils/excel'
import { downloadBackup, parseBackup, readFileAsText } from '../utils/backup'

export default function ExcelImportExport({
  classes,
  teachers,
  subjectCatalog,
  breaks,
  backupState,
  onImport,
  onRestore,
  onError,
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

      <div className="excel-backup">
        <h3>Backup &amp; migration</h3>
        <p className="form-help">
          Export everything (classes, teachers, subjects, periods, teacher assignments, breaks, and schedule
          settings) into a single compact file, then restore it on another device.
        </p>
        <div className="excel-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportBackup}
            disabled={!hasData}
            title={hasData ? 'Export all data to a backup file' : 'Add data first to export'}
          >
            Export all data
          </button>
          <button
            type="button"
            className="btn-primary"
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
