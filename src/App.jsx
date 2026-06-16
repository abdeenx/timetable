import { useState, useCallback, useEffect } from 'react'
import SubjectForm from './components/SubjectForm'
import ClassForm from './components/ClassForm'
import TeacherForm from './components/TeacherForm'
import TimetableView from './components/TimetableView'
import Sidebar from './components/Sidebar'
import InstallPrompt from './components/InstallPrompt'
import ExcelImportExport from './components/ExcelImportExport'
import { generateTimetable } from './utils/generator'
import { migrateLegacySubjects, syncTeacherLinks } from './utils/subjects'
import './App.css'

const PERIODS_PER_DAY = 8
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildDays(weekStartDay, weekLength) {
  const startIndex = Math.max(0, WEEK_DAYS.indexOf(weekStartDay))
  const len = Math.min(7, Math.max(1, parseInt(weekLength, 10) || 5))
  const days = []
  for (let i = 0; i < len; i++) {
    days.push(WEEK_DAYS[(startIndex + i) % WEEK_DAYS.length])
  }
  return days
}

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

export default function App() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [subjectCatalog, setSubjectCatalog] = useState([])
  const [classSubjects, setClassSubjects] = useState([])
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [timetable, setTimetable] = useState(null)
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(45)
  const [weekStartDay, setWeekStartDay] = useState('Monday')
  const [weekLength, setWeekLength] = useState(5)
  const [firstPeriodStartTime, setFirstPeriodStartTime] = useState('08:00')
  const [breaks, setBreaks] = useState([
    { id: 'default-1', label: 'Lunch', durationMinutes: 30, afterPeriod: 2 },
    { id: 'default-2', label: 'Break', durationMinutes: 15, afterPeriod: 6 },
  ])
  const [error, setError] = useState('')

  const days = buildDays(weekStartDay, weekLength)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timetable-data')
      if (!saved) return

      const data = JSON.parse(saved)
      let catalog = data.subjectCatalog || []
      let loadedClassSubjects = data.classSubjects || []
      let loadedAssignments = data.assignments || []

      if (loadedClassSubjects.length === 0 && (data.subjects?.length || 0) > 0) {
        const migrated = migrateLegacySubjects(data.subjects)
        loadedClassSubjects = migrated.classSubjects
        loadedAssignments = migrated.assignments
      }

      if (catalog.length === 0 && loadedClassSubjects.length > 0) {
        catalog = buildCatalogFromSubjects(loadedClassSubjects)
      } else if (catalog.length === 0 && (data.subjects?.length || 0) > 0) {
        catalog = buildCatalogFromSubjects(data.subjects)
      }

      const syncedTeachers = syncTeacherLinks(
        data.teachers || [],
        loadedClassSubjects,
        loadedAssignments,
      )

      setSubjectCatalog(catalog)
      setClassSubjects(loadedClassSubjects)
      setAssignments(loadedAssignments)
      setClasses(data.classes || [])
      setTeachers(syncedTeachers)
      setPeriodDurationMinutes(
        Number.isFinite(parseInt(data.periodDurationMinutes, 10))
          ? parseInt(data.periodDurationMinutes, 10)
          : 45,
      )
      if (typeof data.weekStartDay === 'string' && WEEK_DAYS.includes(data.weekStartDay)) {
        setWeekStartDay(data.weekStartDay)
      }
      const loadedWeekLength = parseInt(data.weekLength, 10)
      if (Number.isFinite(loadedWeekLength) && loadedWeekLength >= 1 && loadedWeekLength <= 7) {
        setWeekLength(loadedWeekLength)
      }
      if (typeof data.firstPeriodStartTime === 'string' && data.firstPeriodStartTime.match(/^\d{2}:\d{2}$/)) {
        setFirstPeriodStartTime(data.firstPeriodStartTime)
      }
      if (Array.isArray(data.breaks) && data.breaks.length > 0) {
        setBreaks(data.breaks)
      }
    } catch {}
  }, [])

  const saveData = useCallback(
    (
      catalog,
      classSubs,
      assign,
      cls,
      teach,
      periodMinutes,
      breakList,
      nextWeekStartDay,
      nextWeekLength,
      nextFirstPeriodStartTime,
    ) => {
    localStorage.setItem(
      'timetable-data',
      JSON.stringify({
        subjectCatalog: catalog,
        classSubjects: classSubs,
        assignments: assign,
        classes: cls,
        teachers: teach,
        periodDurationMinutes: periodMinutes,
        weekStartDay: nextWeekStartDay,
        weekLength: nextWeekLength,
        firstPeriodStartTime: nextFirstPeriodStartTime,
        breaks: breakList,
      }),
    )
    },
    [],
  )

  const handleGenerate = useCallback(() => {
    setError('')
    if (subjectCatalog.length === 0 || classes.length === 0 || teachers.length === 0) {
      setError('Please import or add subjects, classes, and teachers before generating.')
      return
    }
    if (classSubjects.length === 0) {
      setError('Add at least one subject-class with weekly periods on the Subjects tab.')
      return
    }
    const unassigned = classSubjects.filter(
      (cs) => !assignments.some((a) => a.classSubjectId === cs.id && a.teacherId),
    )
    if (unassigned.length > 0) {
      setError('Assign a teacher to every subject-class offering before generating.')
      setActiveTab('subjects')
      return
    }
    try {
      const result = generateTimetable(
        classSubjects,
        assignments,
        classes,
        teachers,
        days,
        PERIODS_PER_DAY,
      )
      setTimetable(result)
      setActiveTab('timetable')
    } catch (e) {
      setError(e.message)
    }
  }, [subjectCatalog, classSubjects, assignments, classes, teachers, days])

  const handleReset = useCallback(() => {
    if (confirm('Delete all data? This cannot be undone.')) {
      setSubjectCatalog([])
      setClassSubjects([])
      setAssignments([])
      setClasses([])
      setTeachers([])
      setTimetable(null)
      setPeriodDurationMinutes(45)
      setWeekStartDay('Monday')
      setWeekLength(5)
      setFirstPeriodStartTime('08:00')
      setBreaks([
        { id: 'default-1', label: 'Lunch', durationMinutes: 30, afterPeriod: 2 },
        { id: 'default-2', label: 'Break', durationMinutes: 15, afterPeriod: 6 },
      ])
      setError('')
      localStorage.removeItem('timetable-data')
    }
  }, [])

  const handleExcelImport = useCallback(
    ({
      subjectCatalog: catalog,
      classSubjects: classSubs,
      assignments: assign,
      classes: cls,
      teachers: teach,
      breaks: importedBreaks,
    }) => {
      setSubjectCatalog(catalog)
      setClassSubjects(classSubs)
      setAssignments(assign)
      setClasses(cls)
      setTeachers(teach)
      if (Array.isArray(importedBreaks) && importedBreaks.length > 0) {
        setBreaks(importedBreaks)
      }
      setTimetable(null)
      setError('')
      saveData(
        catalog,
        classSubs,
        assign,
        cls,
        teach,
        periodDurationMinutes,
        importedBreaks || breaks,
        weekStartDay,
        weekLength,
        firstPeriodStartTime,
      )
      setActiveTab('subjects')
    },
    [saveData, periodDurationMinutes, breaks, weekStartDay, weekLength, firstPeriodStartTime],
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
            breaks={breaks}
            onImport={handleExcelImport}
            onError={setError}
          />
          {activeTab === 'subjects' && (
            <SubjectForm
              subjectCatalog={subjectCatalog}
              onCatalogChange={(catalog) => {
                setSubjectCatalog(catalog)
                saveData(
                  catalog,
                  classSubjects,
                  assignments,
                  classes,
                  teachers,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
              classSubjects={classSubjects}
              onClassSubjectsChange={(classSubs) => {
                setClassSubjects(classSubs)
                saveData(
                  subjectCatalog,
                  classSubs,
                  assignments,
                  classes,
                  teachers,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
              assignments={assignments}
              onAssignmentsChange={(assign) => {
                setAssignments(assign)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assign,
                  classes,
                  teachers,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
              teachers={teachers}
              classes={classes}
              onTeachersChange={(t) => {
                setTeachers(t)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  classes,
                  t,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
            />
          )}
          {activeTab === 'classes' && (
            <ClassForm
              classes={classes}
              classSubjects={classSubjects}
              onChange={(c) => {
                setClasses(c)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  c,
                  teachers,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
            />
          )}
          {activeTab === 'teachers' && (
            <TeacherForm
              teachers={teachers}
              classSubjects={classSubjects}
              classes={classes}
              onChange={(t) => {
                setTeachers(t)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  classes,
                  t,
                  periodDurationMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
            />
          )}
          {activeTab === 'timetable' && (
            <TimetableView
              timetable={timetable}
              days={days}
              periods={PERIODS_PER_DAY}
              periodDurationMinutes={periodDurationMinutes}
              onPeriodDurationMinutesChange={(nextMinutes) => {
                setPeriodDurationMinutes(nextMinutes)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  classes,
                  teachers,
                  nextMinutes,
                  breaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
              weekStartDay={weekStartDay}
              weekLength={weekLength}
              firstPeriodStartTime={firstPeriodStartTime}
              onWeekSettingsChange={({ nextWeekStartDay, nextWeekLength, nextFirstPeriodStartTime }) => {
                if (nextWeekStartDay) setWeekStartDay(nextWeekStartDay)
                if (typeof nextWeekLength === 'number') setWeekLength(nextWeekLength)
                if (typeof nextFirstPeriodStartTime === 'string') setFirstPeriodStartTime(nextFirstPeriodStartTime)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  classes,
                  teachers,
                  periodDurationMinutes,
                  breaks,
                  nextWeekStartDay ?? weekStartDay,
                  nextWeekLength ?? weekLength,
                  nextFirstPeriodStartTime ?? firstPeriodStartTime,
                )
              }}
              breaks={breaks}
              onBreaksChange={(nextBreaks) => {
                setBreaks(nextBreaks)
                saveData(
                  subjectCatalog,
                  classSubjects,
                  assignments,
                  classes,
                  teachers,
                  periodDurationMinutes,
                  nextBreaks,
                  weekStartDay,
                  weekLength,
                  firstPeriodStartTime,
                )
              }}
            />
          )}
        </div>
      </main>
      <InstallPrompt />
    </div>
  )
}
