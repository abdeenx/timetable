import { useState, useCallback, useEffect } from 'react'
import SubjectForm from './components/SubjectForm'
import ClassForm from './components/ClassForm'
import TeacherForm from './components/TeacherForm'
import TimetableView from './components/TimetableView'
import Sidebar from './components/Sidebar'
import InstallPrompt from './components/InstallPrompt'
import ExcelImportExport from './components/ExcelImportExport'
import { generateTimetable } from './utils/generator'
import './App.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS_PER_DAY = 8

export default function App() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [error, setError] = useState('')

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timetable-data')
      if (saved) {
        const data = JSON.parse(saved)
        setSubjects(data.subjects || [])
        setClasses(data.classes || [])
        setTeachers(data.teachers || [])
      }
    } catch {}
  }, [])

  // Save to localStorage
  const saveData = useCallback((subj, cls, teach) => {
    localStorage.setItem('timetable-data', JSON.stringify({ subjects: subj, classes: cls, teachers: teach }))
  }, [])

  const handleGenerate = useCallback(() => {
    setError('')
    if (subjects.length === 0 || classes.length === 0 || teachers.length === 0) {
      setError('Please add at least one subject, class, and teacher before generating.')
      return
    }
    try {
      const result = generateTimetable(subjects, classes, teachers, DAYS, PERIODS_PER_DAY)
      setTimetable(result)
      setActiveTab('timetable')
    } catch (e) {
      setError(e.message)
    }
  }, [subjects, classes, teachers])

  const handleReset = useCallback(() => {
    if (confirm('Delete all data? This cannot be undone.')) {
      setSubjects([])
      setClasses([])
      setTeachers([])
      setTimetable(null)
      setError('')
      localStorage.removeItem('timetable-data')
    }
  }, [])

  const handleExcelImport = useCallback(({ subjects: subj, classes: cls, teachers: teach }) => {
    setSubjects(subj)
    setClasses(cls)
    setTeachers(teach)
    setTimetable(null)
    setError('')
    saveData(subj, cls, teach)
    setActiveTab('subjects')
  }, [saveData])

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main">
        <header className="header">
          <div className="header-brand">
            <img src="/logo.png" alt="" className="header-logo" width={40} height={40} />
            <h1>School Timetable Generator</h1>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={handleGenerate}>
              Generate Timetable
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Reset All
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="content">
          <ExcelImportExport
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            onImport={handleExcelImport}
            onError={setError}
          />
          {activeTab === 'subjects' && (
            <SubjectForm
              subjects={subjects}
              teachers={teachers}
              classes={classes}
              onChange={(s) => { setSubjects(s); saveData(s, classes, teachers) }}
            />
          )}
          {activeTab === 'classes' && (
            <ClassForm
              classes={classes}
              subjects={subjects}
              onChange={(c) => { setClasses(c); saveData(subjects, c, teachers) }}
            />
          )}
          {activeTab === 'teachers' && (
            <TeacherForm
              teachers={teachers}
              subjects={subjects}
              classes={classes}
              onChange={(t) => { setTeachers(t); saveData(subjects, classes, t) }}
            />
          )}
          {activeTab === 'timetable' && (
            <TimetableView timetable={timetable} days={DAYS} periods={PERIODS_PER_DAY} />
          )}
        </div>
      </main>
      <InstallPrompt />
    </div>
  )
}
