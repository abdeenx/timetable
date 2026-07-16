import { useState, useCallback, useEffect } from 'react'
import SubjectForm from './components/SubjectForm'
import ClassForm from './components/ClassForm'
import TeacherForm from './components/TeacherForm'
import TimetableView from './components/TimetableView'
import SiteSettings from './components/SiteSettings'
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

const DEFAULT_PERIODS_PER_DAY = 8
const MAX_PERIODS_PER_DAY = 16
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

function sanitizePeriodsPerDay(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_PERIODS_PER_DAY
    ? parsed
    : DEFAULT_PERIODS_PER_DAY
}

function sanitizeFixedSlots(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (f) =>
        f &&
        typeof f === 'object' &&
        WEEK_DAYS.includes(f.day) &&
        Number.isFinite(parseInt(f.period, 10)) &&
        f.catalogId,
    )
    .map((f) => ({
      id: String(f.id || `${f.day}-${f.period}-${f.catalogId}`),
      day: f.day,
      period: Math.min(MAX_PERIODS_PER_DAY, Math.max(1, parseInt(f.period, 10))),
      catalogId: f.catalogId,
      teacherId: typeof f.teacherId === 'string' && f.teacherId ? f.teacherId : null,
    }))
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
  const [periodsPerDay, setPeriodsPerDay] = useState(DEFAULT_PERIODS_PER_DAY)
  const [fixedSlots, setFixedSlots] = useState([])
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
      if (data.periodsPerDay !== undefined) {
        setPeriodsPerDay(sanitizePeriodsPerDay(data.periodsPerDay))
      }
      setFixedSlots(sanitizeFixedSlots(data.fixedSlots))
    } catch {}
  }, [])

  const saveData = useCallback(
    (overrides = {}) => {
      localStorage.setItem(
        'timetable-data',
        JSON.stringify({
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
          periodsPerDay,
          fixedSlots,
          ...overrides,
        }),
      )
    },
    [
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
      periodsPerDay,
      fixedSlots,
    ],
  )

  const handleGenerate = useCallback(() => {
    setError('')
    if (subjectCatalog.length === 0 || classes.length === 0 || teachers.length === 0) {
      setError('Please import or add subjects, classes, and teachers before generating.')
      return
    }
    if (gradeSubjects.length === 0) {
      setError('Add at least one subject with weekly lessons per grade on the Subjects tab.')
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
      setError('Assign a teacher to every subject/class offering before generating.')
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
        periodsPerDay,
        fixedSlots,
      )
      setTimetable(result)
      setActiveTab('timetable')
    } catch (e) {
      setError(e.message)
    }
  }, [subjectCatalog, gradeSubjects, assignments, classes, teachers, days, periodsPerDay, fixedSlots])

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
      setPeriodsPerDay(DEFAULT_PERIODS_PER_DAY)
      setFixedSlots([])
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
      saveData({
        subjectCatalog: catalog,
        gradeSubjects: gradeSubs || [],
        assignments: assign || [],
        classes: cls,
        teachers: teach,
        breaks: importedBreaks || breaks,
      })
      setActiveTab('subjects')
    },
    [saveData, breaks],
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
      const nextPeriodsPerDay =
        restored.periodsPerDay !== undefined
          ? sanitizePeriodsPerDay(restored.periodsPerDay)
          : periodsPerDay
      const nextFixedSlots =
        restored.fixedSlots !== undefined ? sanitizeFixedSlots(restored.fixedSlots) : fixedSlots

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
      setPeriodsPerDay(nextPeriodsPerDay)
      setFixedSlots(nextFixedSlots)
      setTimetable(null)
      setError('')

      saveData({
        subjectCatalog: nextCatalog,
        gradeSubjects: nextGradeSubjects,
        assignments: nextAssignments,
        classes: nextClasses,
        teachers: nextTeachers,
        periodDurationMinutes: nextPeriodMinutes,
        weekStartDay: nextWeekStartDay,
        weekLength: nextWeekLength,
        firstPeriodStartTime: nextFirstPeriodStartTime,
        breaks: nextBreaks,
        periodsPerDay: nextPeriodsPerDay,
        fixedSlots: nextFixedSlots,
      })
      setActiveTab('subjects')
    },
    [saveData, breaks, periodsPerDay, fixedSlots],
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
              periodsPerDay,
              fixedSlots,
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
                saveData({ subjectCatalog: catalog })
              }}
              gradeSubjects={gradeSubjects}
              onGradeSubjectsChange={(gradeSubs) => {
                setGradeSubjects(gradeSubs)
                saveData({ gradeSubjects: gradeSubs })
              }}
              assignments={assignments}
              onAssignmentsChange={(assign) => {
                setAssignments(assign)
                saveData({ assignments: assign })
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
                saveData({ classes: c })
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
                saveData({ teachers: t })
              }}
            />
          )}
          {activeTab === 'timetable' && (
            <TimetableView
              timetable={timetable}
              days={days}
              periods={periodsPerDay}
              periodDurationMinutes={periodDurationMinutes}
              onPeriodDurationMinutesChange={(nextMinutes) => {
                setPeriodDurationMinutes(nextMinutes)
                saveData({ periodDurationMinutes: nextMinutes })
              }}
              weekStartDay={weekStartDay}
              weekLength={weekLength}
              firstPeriodStartTime={firstPeriodStartTime}
              onWeekSettingsChange={({ nextWeekStartDay, nextWeekLength, nextFirstPeriodStartTime }) => {
                if (nextWeekStartDay) setWeekStartDay(nextWeekStartDay)
                if (typeof nextWeekLength === 'number') setWeekLength(nextWeekLength)
                if (typeof nextFirstPeriodStartTime === 'string') setFirstPeriodStartTime(nextFirstPeriodStartTime)
                saveData({
                  weekStartDay: nextWeekStartDay ?? weekStartDay,
                  weekLength: nextWeekLength ?? weekLength,
                  firstPeriodStartTime: nextFirstPeriodStartTime ?? firstPeriodStartTime,
                })
              }}
              breaks={breaks}
              onBreaksChange={(nextBreaks) => {
                setBreaks(nextBreaks)
                saveData({ breaks: nextBreaks })
              }}
            />
          )}
          {activeTab === 'settings' && (
            <SiteSettings
              periodsPerDay={periodsPerDay}
              onPeriodsPerDayChange={(next) => {
                setPeriodsPerDay(next)
                saveData({ periodsPerDay: next })
              }}
              fixedSlots={fixedSlots}
              onFixedSlotsChange={(next) => {
                setFixedSlots(next)
                saveData({ fixedSlots: next })
              }}
              subjectCatalog={subjectCatalog}
              teachers={teachers}
              days={days}
            />
          )}
        </div>
      </main>
      <InstallPrompt />
    </div>
  )
}
