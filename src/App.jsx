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

function buildCatalogFromSubjects(subjects) {
  const seen = new Map()
  for (const subject of subjects) {
    const key = subject.name?.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.set(key, {
      id: subject.catalogId || `catalog-${seen.size + 1}-${Date.now()}`,
      name: subject.name,
    })
  }
  return [...seen.values()]
}

function attachCatalogIds(subjects, catalog) {
  const byName = new Map(catalog.map((entry) => [entry.name.toLowerCase(), entry.id]))
  return subjects.map((subject) => ({
    ...subject,
    catalogId: subject.catalogId || byName.get(subject.name?.toLowerCase()) || null,
  }))
}

export default function App() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [subjectCatalog, setSubjectCatalog] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timetable-data')
      if (!saved) return

      const data = JSON.parse(saved)
      const loadedSubjects = data.subjects || []
      let catalog = data.subjectCatalog || []

      if (catalog.length === 0 && loadedSubjects.length > 0) {
        catalog = buildCatalogFromSubjects(loadedSubjects)
      }

      setSubjectCatalog(catalog)
      setSubjects(attachCatalogIds(loadedSubjects, catalog))
      setClasses(data.classes || [])
      setTeachers(data.teachers || [])
    } catch {}
  }, [])

  const saveData = useCallback((catalog, subj, cls, teach) => {
    localStorage.setItem(
      'timetable-data',
      JSON.stringify({
        subjectCatalog: catalog,
        subjects: subj,
        classes: cls,
        teachers: teach,
      }),
    )
  }, [])

  const handleGenerate = useCallback(() => {
    setError('')
    if (subjectCatalog.length === 0 || classes.length === 0 || teachers.length === 0) {
      setError('Please import or add subjects, classes, and teachers before generating.')
      return
    }
    if (subjects.length === 0) {
      setError('Add at least one subject assignment (class + teacher) on the Subjects tab.')
      return
    }
    const incomplete = subjects.filter((s) => !s.classId || !s.teacherId)
    if (incomplete.length > 0) {
      setError('Complete all subject assignments with a class and teacher before generating.')
      setActiveTab('subjects')
      return
    }
    try {
      const result = generateTimetable(subjects, classes, teachers, DAYS, PERIODS_PER_DAY)
      setTimetable(result)
      setActiveTab('timetable')
    } catch (e) {
      setError(e.message)
    }
  }, [subjectCatalog, subjects, classes, teachers])

  const handleReset = useCallback(() => {
    if (confirm('Delete all data? This cannot be undone.')) {
      setSubjectCatalog([])
      setSubjects([])
      setClasses([])
      setTeachers([])
      setTimetable(null)
      setError('')
      localStorage.removeItem('timetable-data')
    }
  }, [])

  const handleExcelImport = useCallback(
    ({ subjectCatalog: catalog, subjects: subj, classes: cls, teachers: teach }) => {
      setSubjectCatalog(catalog)
      setSubjects(subj)
      setClasses(cls)
      setTeachers(teach)
      setTimetable(null)
      setError('')
      saveData(catalog, subj, cls, teach)
      setActiveTab('subjects')
    },
    [saveData],
  )

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
            subjectCatalog={subjectCatalog}
            onImport={handleExcelImport}
            onError={setError}
          />
          {activeTab === 'subjects' && (
            <SubjectForm
              subjectCatalog={subjectCatalog}
              onCatalogChange={(catalog) => {
                setSubjectCatalog(catalog)
                saveData(catalog, subjects, classes, teachers)
              }}
              subjects={subjects}
              teachers={teachers}
              classes={classes}
              onChange={(s) => {
                setSubjects(s)
                saveData(subjectCatalog, s, classes, teachers)
              }}
              onTeachersChange={(t) => {
                setTeachers(t)
                saveData(subjectCatalog, subjects, classes, t)
              }}
            />
          )}
          {activeTab === 'classes' && (
            <ClassForm
              classes={classes}
              subjects={subjects}
              onChange={(c) => {
                setClasses(c)
                saveData(subjectCatalog, subjects, c, teachers)
              }}
            />
          )}
          {activeTab === 'teachers' && (
            <TeacherForm
              teachers={teachers}
              subjects={subjects}
              classes={classes}
              onChange={(t) => {
                setTeachers(t)
                saveData(subjectCatalog, subjects, classes, t)
              }}
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
