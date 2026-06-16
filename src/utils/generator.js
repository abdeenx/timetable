/**
 * Timetable generation algorithm.
 *
 * Constraints:
 * 1. A teacher can only teach one class per period
 * 2. A class can only have one subject per period
 * 3. Each subject-class offering gets its required weekly periods
 * 4. No teacher exceeds their max periods per week
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
        `${label}: ${totalNeeded} periods needed but only ${totalSlots} slots available (${days.length} days × ${periodsPerDay} periods). Reduce subject periods.`,
      )
    }
    for (const subj of subjectSlots) {
      const maxWithDoublePeriods = days.length * 2
      if (subj.hoursPerWeek > maxWithDoublePeriods) {
        warnings.push(
          `${label} - ${subj.name}: requires ${subj.hoursPerWeek} periods/week, but with a maximum of two consecutive periods per day the most you can schedule is ${maxWithDoublePeriods}.`,
        )
      }
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

    // Track how many times each subject is scheduled per day for this class.
    // Policy:
    // - Prefer at most 1 per day
    // - If required periods/week > number of days, allow a second period on some days
    //   but only as a double period (consecutive), and never more than 2/day.
    const perDayCounts = new Map() // key: `${subjectId}:${day}` -> count
    const perWeekCounts = new Map() // key: subjectId -> count

    for (const slot of allSlots) {
      if (subjectSlots.every((s) => s.remaining === 0)) break
      if (schedule[label][slot.day][slot.period] !== null) continue

      const available = subjectSlots
        .filter((s) => s.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)

      for (const subj of available) {
        if (subj.remaining <= 0) continue

        const subjectId = subj.id
        const perDayKey = `${subjectId}:${slot.day}`
        const alreadyToday = perDayCounts.get(perDayKey) || 0
        const required = subj.hoursPerWeek
        const needsDouble = required > days.length

        if (alreadyToday >= 1) {
          if (!needsDouble) continue
          if (alreadyToday >= 2) continue

          // Only allow the 2nd period if it forms a double period (consecutive).
          const prev = slot.period > 0 ? schedule[label][slot.day][slot.period - 1] : null
          const next =
            slot.period < periodsPerDay - 1 ? schedule[label][slot.day][slot.period + 1] : null

          const adjacentSame =
            (prev && prev.subjectId === subjectId) || (next && next.subjectId === subjectId)
          if (!adjacentSame) continue

          // If we are creating a double period, the teacher must match across the consecutive periods.
          // (If teacher is unassigned, allow it as long as the adjacent period is also unassigned.)
          const intendedTeacherId = subj.teacher?.id || null
          const adjacentCell =
            prev?.subjectId === subjectId ? prev : next?.subjectId === subjectId ? next : null
          if (adjacentCell && (adjacentCell.teacherId || null) !== intendedTeacherId) continue
        }

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
            subjectId,
          }
          subj.remaining--
          if (teacher) teacherLoad[teacher.id]++
          perDayCounts.set(perDayKey, alreadyToday + 1)
          perWeekCounts.set(subjectId, (perWeekCounts.get(subjectId) || 0) + 1)
          break
        }
      }
    }

    for (const subj of subjectSlots) {
      if (subj.remaining > 0) {
        warnings.push(
          `${label} - ${subj.name}: could only schedule ${subj.hoursPerWeek - subj.remaining}/${subj.hoursPerWeek} periods. Check teacher availability or add more slots.`,
        )
      }
    }
  }

  for (const t of teachers) {
    if (teacherLoad[t.id] > t.maxHoursPerWeek) {
      warnings.push(
        `${t.name}: assigned ${teacherLoad[t.id]} periods but max is ${t.maxHoursPerWeek}.`,
      )
    }
  }

  return { schedule, warnings }
}
