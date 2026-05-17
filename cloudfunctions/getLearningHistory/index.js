// 云函数: getLearningHistory - 学习记录 timeline
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function dateStr(d) { return d.toISOString().slice(0, 10) }
function md(d) { return `${d.getMonth() + 1}月${d.getDate()}日` }

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { period = 'week' } = event
  if (!OPENID) return { ok: false, err: 'NO_OPENID' }

  try {
    const now = new Date()
    let sinceDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    if (period === 'month') sinceDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
    else if (period === 'all') sinceDate = new Date(0)

    const res = await db.collection('user_practice')
      .where({ _openid: OPENID, practiced_at: _.gte(sinceDate) })
      .orderBy('practiced_at', 'desc')
      .limit(200)
      .get()
    const records = res.data || []

    // 按日期聚合
    const dayMap = {}
    records.forEach((r) => {
      const ds = r.practiced_at ? dateStr(new Date(r.practiced_at)) : ''
      if (!ds) return
      if (!dayMap[ds]) dayMap[ds] = { date: ds, items: [], totalScore: 0 }
      dayMap[ds].items.push(r)
      dayMap[ds].totalScore += r.score_overall || 0
    })

    // 构造 timeline
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const timeline = []
    const days = period === 'week' ? 7 : (period === 'month' ? 30 : 30)
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * 24 * 3600 * 1000)
      const ds = dateStr(d)
      const entry = dayMap[ds]
      let dayLabel = md(d)
      if (i === 0) dayLabel += ' · 今天'
      else if (i === 1) dayLabel += ' · 昨天'

      if (entry && entry.items.length > 0) {
        const avgScore = Math.round(entry.totalScore / entry.items.length)
        timeline.push({
          date: ds,
          dayLabel,
          missed: false,
          summary: `完成 ${entry.items.length} 句练习`,
          stats: {
            sentences: entry.items.length,
            minutes: Math.max(1, entry.items.length * 4),
            avg: avgScore,
          },
        })
      } else if (i < days) {
        timeline.push({
          date: ds,
          dayLabel,
          missed: true,
          summary: '没有练习',
        })
      }
    }

    return { ok: true, data: { timeline, total: records.length } }
  } catch (err) {
    console.error('[getLearningHistory] error', err)
    return { ok: false, err: err.message, data: { timeline: [], total: 0 } }
  }
}
