import Taro from '@tarojs/taro'

// ─── Storage keys ────────────────────────────────────────────
const KEY_SETTINGS = 'wm_settings'
const KEY_STREAK   = 'wm_streak'
const KEY_LIFETIME_TOTAL = 'wm_lifetime_total'
const recordsKey   = (date) => `wm_records_${date}`

function clampNonNegativeNumber(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 0) return 0
  return v
}

function parseYmdToDate(dateStr) {
  // Avoid `new Date('YYYY-MM-DD')` parsing differences across runtimes.
  const [y, m, d] = String(dateStr).split('-').map(x => parseInt(x, 10))
  if (!y || !m || !d) return new Date(NaN)
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return date
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shiftYmd(dateStr, deltaDays) {
  const d = parseYmdToDate(dateStr)
  d.setDate(d.getDate() + deltaDays)
  return toYmd(d)
}

function isSameDay(a, b) {
  return String(a) === String(b)
}

function isYesterday(dateStr, comparedToStr) {
  return isSameDay(dateStr, shiftYmd(comparedToStr, -1))
}

function readNumberSync(key) {
  try {
    const raw = Taro.getStorageSync(key)
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string' && raw.trim() !== '') return Number(raw)
    return NaN
  } catch {
    return NaN
  }
}

function writeNumberSync(key, value) {
  try {
    Taro.setStorageSync(key, clampNonNegativeNumber(value))
  } catch {
    // ignore
  }
}

function computeConsecutiveDaysEndingAt(endDateStr, dailyGoal, maxDays = 366) {
  let count = 0
  let cursor = endDateStr
  for (let i = 0; i < maxDays; i++) {
    const total = getTotalForDate(cursor)
    if (total < dailyGoal) break
    count += 1
    cursor = shiftYmd(cursor, -1)
  }
  return count
}

function normalizeStreak(streak) {
  const today = getTodayStr()
  const last = streak.lastGoalDate || ''

  // If lastGoalDate isn't today/yesterday, there is no ongoing streak.
  if (!last) {
    return { ...streak, current: 0 }
  }
  if (!isSameDay(last, today) && !isYesterday(last, today)) {
    return { ...streak, current: 0 }
  }
  return streak
}

// ─── Date helpers ────────────────────────────────────────────
export function getTodayStr() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return toYmd(d)
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${m}月${d}日`
}

export function getWeekDates() {
  const result = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    result.push(toYmd(d))
  }
  return result
}

export function getWeekDayLabel(dateStr) {
  const labels = ['日', '一', '二', '三', '四', '五', '六']
  const d = parseYmdToDate(dateStr)
  const idx = d.getDay()
  return labels[idx] || ''
}

// ─── Settings ────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  dailyGoal: 2000,
  name: '',
  unit: 'ml'
}

export function getSettings() {
  try {
    const raw = Taro.getStorageSync(KEY_SETTINGS)
    return raw ? { ...DEFAULT_SETTINGS, ...raw } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  const merged = { ...getSettings(), ...(settings || {}) }
  Taro.setStorageSync(KEY_SETTINGS, merged)
}

// ─── Records ─────────────────────────────────────────────────
export function getRecords(dateStr) {
  try {
    const raw = Taro.getStorageSync(recordsKey(dateStr))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveRecords(dateStr, records) {
  Taro.setStorageSync(recordsKey(dateStr), records)
}

export function addRecord(amount) {
  const today = getTodayStr()
  const records = getRecords(today)
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ml = Math.max(0, parseInt(amount, 10) || 0)
  const record = {
    id: `${Date.now()}`,
    amount: ml,
    time: `${h}:${min}`
  }
  const updated = [...records, record]
  saveRecords(today, updated)

  // Keep cached lifetime total in sync
  const cur = readNumberSync(KEY_LIFETIME_TOTAL)
  if (Number.isFinite(cur)) {
    writeNumberSync(KEY_LIFETIME_TOTAL, cur + ml)
  }
  return updated
}

export function deleteRecord(id) {
  const today = getTodayStr()
  const records = getRecords(today)
  const toDelete = records.find(r => r.id === id)
  const updated = records.filter(r => r.id !== id)
  saveRecords(today, updated)

  // Keep cached lifetime total in sync
  const cur = readNumberSync(KEY_LIFETIME_TOTAL)
  if (Number.isFinite(cur) && toDelete) {
    writeNumberSync(KEY_LIFETIME_TOTAL, cur - (toDelete.amount || 0))
  }
  return updated
}

export function getTotalForDate(dateStr) {
  const records = getRecords(dateStr)
  return records.reduce((sum, r) => sum + r.amount, 0)
}

// ─── Streak (连续打卡) ─────────────────────────────────────────
const DEFAULT_STREAK = {
  current: 0,
  longest: 0,
  lastGoalDate: ''
}

export function getStreak() {
  try {
    const raw = Taro.getStorageSync(KEY_STREAK)
    const merged = raw ? { ...DEFAULT_STREAK, ...raw } : { ...DEFAULT_STREAK }
    const normalized = normalizeStreak(merged)
    // Persist normalized current to avoid stale UI after long inactivity.
    if (normalized.current !== merged.current) {
      Taro.setStorageSync(KEY_STREAK, normalized)
    }
    return normalized
  } catch {
    return { ...DEFAULT_STREAK }
  }
}

/** Call each time user adds water; updates streak if today's goal is newly met */
export function checkAndUpdateStreak(currentTotal, dailyGoal) {
  const today = getTodayStr()
  const goal = clampNonNegativeNumber(dailyGoal)
  const streak = getStreak()

  // Today is met -> recompute consecutive chain ending today.
  if (currentTotal >= goal && goal > 0) {
    const current = computeConsecutiveDaysEndingAt(today, goal)
    const updated = {
      current,
      longest: Math.max(streak.longest, current),
      lastGoalDate: today
    }
    Taro.setStorageSync(KEY_STREAK, updated)
    return updated
  }

  // Not met today: if previously counted today (possible after deletion/clear), rollback.
  if (streak.lastGoalDate === today) {
    const yStr = shiftYmd(today, -1)
    const yTotal = getTotalForDate(yStr)
    const current = yTotal >= goal && goal > 0
      ? computeConsecutiveDaysEndingAt(yStr, goal)
      : 0
    const updated = {
      current,
      longest: streak.longest,
      lastGoalDate: current > 0 ? yStr : ''
    }
    Taro.setStorageSync(KEY_STREAK, updated)
    return updated
  }

  return normalizeStreak(streak)
}

// ─── Lifetime total ──────────────────────────────────────────
export function getLifetimeTotal() {
  try {
    const cached = readNumberSync(KEY_LIFETIME_TOTAL)
    if (Number.isFinite(cached)) return clampNonNegativeNumber(cached)

    const info = Taro.getStorageInfoSync()
    let total = 0
    ;(info.keys || [])
      .filter(k => k.startsWith('wm_records_'))
      .forEach(k => {
        const recs = Taro.getStorageSync(k)
        if (Array.isArray(recs)) {
          recs.forEach(r => { total += (r.amount || 0) })
        }
      })
    writeNumberSync(KEY_LIFETIME_TOTAL, total)
    return total
  } catch {
    return 0
  }
}

// ─── Data maintenance helpers ───────────────────────────────
export function clearRecordsForDate(dateStr) {
  const key = recordsKey(dateStr)
  try {
    const existing = getRecords(dateStr)
    const dayTotal = existing.reduce((s, r) => s + (r.amount || 0), 0)
    Taro.removeStorageSync(key)

    const cur = readNumberSync(KEY_LIFETIME_TOTAL)
    if (Number.isFinite(cur)) {
      writeNumberSync(KEY_LIFETIME_TOTAL, cur - dayTotal)
    }

    // If user cleared today and it was previously counted as goal day, rollback streak.
    if (isSameDay(dateStr, getTodayStr())) {
      const { dailyGoal } = getSettings()
      checkAndUpdateStreak(0, dailyGoal)
    }
  } catch {
    // ignore
  }
}

export function clearTodayRecords() {
  clearRecordsForDate(getTodayStr())
}

export function clearAllData() {
  try {
    Taro.clearStorageSync()
  } catch {
    // ignore
  }
}

// ─── Week data (for history chart) ───────────────────────────
export function getWeekData() {
  const dates = getWeekDates()
  const { dailyGoal } = getSettings()
  return dates.map(date => ({
    date,
    label: getWeekDayLabel(date),
    display: formatDate(date),
    total: getTotalForDate(date),
    goal: dailyGoal,
    isToday: date === getTodayStr()
  }))
}

// ─── Motivational messages ───────────────────────────────────
export function getMotivation(percent) {
  if (percent === 0)  return '今天还没开始喝水，快来一杯吧！💧'
  if (percent < 25)   return '好的开始！继续保持节奏 🌱'
  if (percent < 50)   return '正在进行中，加油！四分之一过了 ✨'
  if (percent < 75)   return '已完成一半，你太棒了！💪'
  if (percent < 100)  return '快到了！最后一口气冲刺 🔥'
  return '🎉 今日目标达成！坚持就是胜利！'
}
