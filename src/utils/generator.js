/**
 * Timetable generation algorithm.
 *
 * Constraints:
 * 1. A teacher can only teach one class per period
 * 2. A class can only have one subject per period
 * 3. Each subject-class offering gets its required weekly hours
 * 4. No teacher exceeds their max hours per week
 */

import { formatClassLabel } from './classes'
import { buildSchedulingUnits } from './subjects'

export function generateTimetable(classSubjects, assignments, classes, teachers, days, periodsPerDay) {
  const schedule = {}
  const teacherLoad = {}
  const warnings = []
  const units = buildSchedulingUnits(classSubjects, assignments, teachers)

  for (const cls of classes) {
    const label = formatClassLabel(cls)
    schedule[label] = {}
    for (const day of days) {
      schedule[label][day] = new Array(periodsPerDay).fill(null)
    }
  }

  for (const t of teachers) {
    teacherLoad[t.id] = 0
  }

  for (const cls of classes) {
    const label = formatClassLabel(cls)
    const classUnits = units.filter((u) => u.classId === cls.id)
    if (classUnits.length === 0) continue

    const subjectSlots = classUnits
      .map((u) => ({
        ...u,
        remaining: u.hoursPerWeek,
        teacher: u.teacher,
      }))
      .filter((u) => u.remaining > 0)

    const totalSlots = days.length * periodsPerDay
    const totalNeeded = subjectSlots.reduce((sum, s) => sum + s.remaining, 0)
    if (totalNeeded > totalSlots) {
      warnings.push(
        `${label}: ${totalNeeded} hours needed but only ${totalSlots} slots available (${days.length} days × ${periodsPerDay} periods). Reduce subject hours.`,
      )
    }

    const allSlots = []
    for (const day of days) {
      for (let p = 0; p < periodsPerDay; p++) {
        allSlots.push({ day, period: p })
      }
    }
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]]
    }

    for (const slot of allSlots) {
      if (subjectSlots.every((s) => s.remaining === 0)) break
      if (schedule[label][slot.day][slot.period] !== null) continue

      const available = subjectSlots
        .filter((s) => s.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)

      for (const subj of available) {
        if (subj.remaining <= 0) continue

        const teacher = subj.teacher
        let teacherBusy = false
        if (teacher) {
          for (const clsSchedule of Object.values(schedule)) {
            if (clsSchedule[slot.day]?.[slot.period]?.teacherId === teacher.id) {
              teacherBusy = true
              break
            }
          }
          if (teacherLoad[teacher.id] >= teacher.maxHoursPerWeek) {
            continue
          }
        }

        if (!teacherBusy) {
          schedule[label][slot.day][slot.period] = {
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

    for (const subj of subjectSlots) {
      if (subj.remaining > 0) {
        warnings.push(
          `${label} - ${subj.name}: could only schedule ${subj.hoursPerWeek - subj.remaining}/${subj.hoursPerWeek} hours. Check teacher availability or add more slots.`,
        )
      }
    }
  }

  for (const t of teachers) {
    if (teacherLoad[t.id] > t.maxHoursPerWeek) {
      warnings.push(`${t.name}: assigned ${teacherLoad[t.id]} hours but max is ${t.maxHoursPerWeek}.`)
    }
  }

  return { schedule, warnings }
}
