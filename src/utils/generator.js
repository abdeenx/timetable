/**
 * Timetable generation algorithm.
 * 
 * Constraints:
 * 1. A teacher can only teach one class per period
 * 2. A class can only have one subject per period
 * 3. Each subject gets its required weekly hours, spread across days
 * 4. No teacher exceeds their max hours per week
 * 5. Subjects are reasonably distributed across the week (not all on one day)
 */

export function generateTimetable(subjects, classes, teachers, days, periodsPerDay) {
  const schedule = {}
  const teacherLoad = {}   // teacherId -> current assigned hours
  const warnings = []

  // Initialize schedule for each class
  for (const cls of classes) {
    schedule[cls.name] = {}
    for (const day of days) {
      schedule[cls.name][day] = new Array(periodsPerDay).fill(null)
    }
  }

  // Initialize teacher load
  for (const t of teachers) {
    teacherLoad[t.id] = 0
  }

  // For each class, schedule its subjects
  for (const cls of classes) {
    const classSubjects = subjects.filter(s => s.classId === cls.id)
    if (classSubjects.length === 0) continue

    // Track how many slots we need for each subject
    const subjectSlots = classSubjects.map(s => ({
      ...s,
      remaining: s.hoursPerWeek,
      teacher: teachers.find(t => t.id === s.teacherId),
    })).filter(s => s.remaining > 0)

    // Check if total hours fit in the week
    const totalSlots = days.length * periodsPerDay
    const totalNeeded = subjectSlots.reduce((sum, s) => sum + s.remaining, 0)
    if (totalNeeded > totalSlots) {
      warnings.push(
        `${cls.name}: ${totalNeeded} hours needed but only ${totalSlots} slots available (${days.length} days × ${periodsPerDay} periods). Reduce subject hours.`
      )
    }

    // Shuffle slots to spread subjects across days
    const allSlots = []
    for (const day of days) {
      for (let p = 0; p < periodsPerDay; p++) {
        allSlots.push({ day, period: p })
      }
    }
    // Fisher-Yates shuffle
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]]
    }

    // Assign subjects to slots
    for (const slot of allSlots) {
      if (subjectSlots.every(s => s.remaining === 0)) break
      if (schedule[cls.name][slot.day][slot.period] !== null) continue

      // Pick a subject that still needs slots, prioritizing higher remaining counts
      const available = subjectSlots
        .filter(s => s.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)

      for (const subj of available) {
        if (subj.remaining <= 0) continue

        const teacher = subj.teacher
        // Check teacher isn't already teaching this period (across all classes)
        let teacherBusy = false
        if (teacher) {
          for (const [clsName, clsSchedule] of Object.entries(schedule)) {
            if (clsSchedule[slot.day]?.[slot.period]?.teacherId === teacher.id) {
              teacherBusy = true
              break
            }
          }
          // Check teacher max hours
          if (teacherLoad[teacher.id] >= teacher.maxHoursPerWeek) {
            continue // skip, try next subject
          }
        }

        if (!teacherBusy) {
          schedule[cls.name][slot.day][slot.period] = {
            subject: subj.name,
            teacher: teacher?.name || 'Unassigned',
            teacherId: teacher?.id || null,
          }
          subj.remaining--
          if (teacher) teacherLoad[teacher.id]++
          break
        }
      }
    }

    // Check for unmet hours
    for (const subj of subjectSlots) {
      if (subj.remaining > 0) {
        warnings.push(
          `${cls.name} - ${subj.name}: could only schedule ${subj.hoursPerWeek - subj.remaining}/${subj.hoursPerWeek} hours. Check teacher availability or add more slots.`
        )
      }
    }
  }

  // Check teacher overload
  for (const t of teachers) {
    if (teacherLoad[t.id] > t.maxHoursPerWeek) {
      warnings.push(`${t.name}: assigned ${teacherLoad[t.id]} hours but max is ${t.maxHoursPerWeek}.`)
    }
  }

  return { schedule, warnings }
}
