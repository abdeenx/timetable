import { useState, useCallback, useEffect } from 'react'
import SubjectForm from './components/SubjectForm'
import ClassForm from './components/ClassForm'
import TeacherForm from './components/TeacherForm'
import TimetableView from './components/TimetableView'
import Sidebar from './components/Sidebar'
import InstallPrompt from './components/InstallPrompt'
import ExcelImportExport from './components/ExcelImportExport'
import { generateTimetable } from './utils/generator'
import {
  migrateLegacySubjects,
  migrateClassSubjectsToGrade,
  buildOfferings,
} from './utils/subjects'
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

function buildCatalogFromRows(rows) {
  const seen = new Map()
  for (const row of rows) {
    const key = row.name?.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.set(key, {
      id: row.catalogId || `catalog-${seen.size + 1}-${Date.now()}`,
      name: row.name,
    })
  }
  return [...seen.values()]
}

function migrateTeachers(rawTeachers, legacyClassSubjects, classes) {
  return rawTeachers.map((t) => {
    let subjectCatalogIds = t.subjectCatalogIds
    if (!Array.isArray(subjectCatalogIds) || subjectCatalogIds.length === 0) {
      const legacyClassSubjectIds = t.classSubjectIds?.length ? t.classSubjectIds : t.subjectIds || []
      subjectCatalogIds = [
        ...new Set(
          (legacyClassSubjectIds || [])
            .map((csId) => legacyClassSubjects.find((cs) => cs.id === csId)?.catalogId)
            .filter(Boolean),
        ),
      ]
    }

    // Teacher availability is by grade. Derive grades from any legacy
    // class-based availability when grades aren't already present.
    const legacyClassIds = Array.isArray(t.availableClassIds)
      ? t.availableClassIds
      : Array.isArray(t.classIds)
        ? t.classIds
        : []
    const availableGrades = Array.isArray(t.availableGrades)
      ? t.availableGrades
      : [
          ...new Set(
            legacyClassIds
              .map((id) => classes.find((c) => c.id === id)?.grade)
              .filter(Boolean),
          ),
        ]

    const { availableClassIds: _drop, classIds: _drop2, subjectIds: _drop3, classSubjectIds: _drop4, ...rest } = t
    return { ...rest, subjectCatalogIds, availableGrades }
  })
}

export default function App() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [subjectCatalog, setSubjectCatalog] = useState([])
  const [gradeSubjects, setGradeSubjects] = useState([])
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
      const loadedClasses = data.classes || []

      // Resolve a legacy per-class subjects array (for migration of both
      // subject definitions and teacher subject links).
      let legacyClassSubjects = data.classSubjects || []
      let legacyAssignments = data.assignments || []
      if (legacyClassSubjects.length === 0 && (data.subjects?.length || 0) > 0) {
        const migrated = migrateLegacySubjects(data.subjects)
        legacyClassSubjects = migrated.classSubjects
        legacyAssignments = migrated.assignments
      }

      // Grade subjects: prefer new shape, otherwise migrate from per-class.
      let loadedGradeSubjects = data.gradeSubjects || []
      let loadedAssignments = data.gradeSubjects ? data.assignments || [] : []
      if (loadedGradeSubjects.length === 0 && legacyClassSubjects.length > 0) {
        const migrated = migrateClassSubjectsToGrade(
          legacyClassSubjects,
          legacyAssignments,
          loadedClasses,
        )
        loadedGradeSubjects = migrated.gradeSubjects
        loadedAssignments = migrated.assignments
      }

      let catalog = data.subjectCatalog || []
      if (catalog.length === 0) {
        catalog = buildCatalogFromRows(
          loadedGradeSubjects.length ? loadedGradeSubjects : legacyClassSubjects,
        )
      }

      const migratedTeachers = migrateTeachers(
        data.teachers || [],
        legacyClassSubjects,
        loadedClasses,
      )

      setSubjectCatalog(catalog)
      setGradeSubjects(loadedGradeSubjects)
      setAssignments(loadedAssignments)
      setClasses(loadedClasses)
      setTeachers(migratedTeachers)
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
      gradeSubs,
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
          gradeSubjects: gradeSubs,
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
    if (gradeSubjects.length === 0) {
      setError('Add at least one subject with weekly periods per grade on the Subjects tab.')
      return
    }
    const offerings = buildOfferings(gradeSubjects, classes)
    if (offerings.length === 0) {
      setError('No classes belong to the grades you defined subjects for. Add classes to those grades.')
      return
    }
    const unassigned = offerings.filter(
      (o) => !assignments.some((a) => a.offeringId === o.id && a.teacherId),
    )
    if (unassigned.length > 0) {
      setError('Assign a teacher to every subject-class offering before generating.')
      setActiveTab('subjects')
      return
    }
    try {
      const result = generateTimetable(
        gradeSubjects,
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
  }, [subjectCatalog, gradeSubjects, assignments, classes, teachers, days])

  const handleReset = useCallback(() => {
    if (confirm('Delete all data? This cannot be undone.')) {
      setSubjectCatalog([])
      setGradeSubjects([])
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
      gradeSubjects: gradeSubs,
      assignments: assign,
      classes: cls,
      teachers: teach,
      breaks: importedBreaks,
    }) => {
      setSubjectCatalog(catalog)
      setGradeSubjects(gradeSubs || [])
      setAssignments(assign || [])
      setClasses(cls)
      setTeachers(teach)
      if (Array.isArray(importedBreaks) && importedBreaks.length > 0) {
        setBreaks(importedBreaks)
      }
      setTimetable(null)
      setError('')
      saveData(
        catalog,
        gradeSubs || [],
        assign || [],
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

  const handleRestoreBackup = useCallback(
    (restored) => {
      const nextCatalog = restored.subjectCatalog || []
      const nextClasses = restored.classes || []

      // Accept both new (gradeSubjects) and old (classSubjects) backups.
      let nextGradeSubjects = restored.gradeSubjects || []
      let nextAssignments = restored.gradeSubjects ? restored.assignments || [] : []
      if (nextGradeSubjects.length === 0 && Array.isArray(restored.classSubjects)) {
        const migrated = migrateClassSubjectsToGrade(
          restored.classSubjects,
          restored.assignments || [],
          nextClasses,
        )
        nextGradeSubjects = migrated.gradeSubjects
        nextAssignments = migrated.assignments
      }

      const nextTeachers = migrateTeachers(
        restored.teachers || [],
        restored.classSubjects || [],
        nextClasses,
      )
      const nextPeriodMinutes = Number.isFinite(parseInt(restored.periodDurationMinutes, 10))
        ? parseInt(restored.periodDurationMinutes, 10)
        : 45
      const nextWeekStartDay =
        typeof restored.weekStartDay === 'string' && WEEK_DAYS.includes(restored.weekStartDay)
          ? restored.weekStartDay
          : 'Monday'
      const parsedWeekLength = parseInt(restored.weekLength, 10)
      const nextWeekLength =
        Number.isFinite(parsedWeekLength) && parsedWeekLength >= 1 && parsedWeekLength <= 7
          ? parsedWeekLength
          : 5
      const nextFirstPeriodStartTime =
        typeof restored.firstPeriodStartTime === 'string' &&
        restored.firstPeriodStartTime.match(/^\d{2}:\d{2}$/)
          ? restored.firstPeriodStartTime
          : '08:00'
      const nextBreaks =
        Array.isArray(restored.breaks) && restored.breaks.length > 0 ? restored.breaks : breaks

      setSubjectCatalog(nextCatalog)
      setGradeSubjects(nextGradeSubjects)
      setAssignments(nextAssignments)
      setClasses(nextClasses)
      setTeachers(nextTeachers)
      setPeriodDurationMinutes(nextPeriodMinutes)
      setWeekStartDay(nextWeekStartDay)
      setWeekLength(nextWeekLength)
      setFirstPeriodStartTime(nextFirstPeriodStartTime)
      setBreaks(nextBreaks)
      setTimetable(null)
      setError('')

      saveData(
        nextCatalog,
        nextGradeSubjects,
        nextAssignments,
        nextClasses,
        nextTeachers,
        nextPeriodMinutes,
        nextBreaks,
        nextWeekStartDay,
        nextWeekLength,
        nextFirstPeriodStartTime,
      )
      setActiveTab('subjects')
    },
    [saveData, breaks],
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
            backupState={{
              subjectCatalog,
              gradeSubjects,
              assignments,
              classes,
              teachers,
              periodDurationMinutes,
              weekStartDay,
              weekLength,
              firstPeriodStartTime,
              breaks,
            }}
            onImport={handleExcelImport}
            onRestore={handleRestoreBackup}
            onError={setError}
          />
          {activeTab === 'subjects' && (
            <SubjectForm
              subjectCatalog={subjectCatalog}
              onCatalogChange={(catalog) => {
                setSubjectCatalog(catalog)
                saveData(
                  catalog,
                  gradeSubjects,
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
              gradeSubjects={gradeSubjects}
              onGradeSubjectsChange={(gradeSubs) => {
                setGradeSubjects(gradeSubs)
                saveData(
                  subjectCatalog,
                  gradeSubs,
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
                  gradeSubjects,
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
            />
          )}
          {activeTab === 'classes' && (
            <ClassForm
              classes={classes}
              gradeSubjects={gradeSubjects}
              onChange={(c) => {
                setClasses(c)
                saveData(
                  subjectCatalog,
                  gradeSubjects,
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
              subjectCatalog={subjectCatalog}
              classes={classes}
              onChange={(t) => {
                setTeachers(t)
                saveData(
                  subjectCatalog,
                  gradeSubjects,
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
                  gradeSubjects,
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
                  gradeSubjects,
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
                  gradeSubjects,
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
