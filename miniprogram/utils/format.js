/**
 * 通用格式化
 */

/**
 * 格式化时长为 mm:ss
 */
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/**
 * 格式化为 mm:ss.cs（带百分秒）
 */
function fmtDurationFine(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/**
 * 友好日期：今天 / 昨天 / M月d日
 */
function fmtDateFriendly(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = (today - target) / (1000 * 60 * 60 * 24)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 友好问候语
 */
function fmtGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/**
 * 时间问候 + 表情
 */
function fmtGreetingEmoji() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好 🌙'
  if (h < 11) return '早上好 ☀️'
  if (h < 13) return '中午好 ☕'
  if (h < 18) return '下午好 ☕'
  return '晚上好 🌙'
}

module.exports = {
  fmtDuration,
  fmtDurationFine,
  fmtDateFriendly,
  fmtGreeting,
  fmtGreetingEmoji,
}
