// 云函数: getUserRecordings - 用户录音列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { filter = 'all', limit = 50 } = event
  if (!OPENID) return { ok: false, err: 'NO_OPENID' }

  try {
    let query = db.collection('user_practice').where({ _openid: OPENID })
    if (filter === 'high') {
      query = query.where({ score_overall: _.gte(80) })
    } else if (filter === 'low') {
      query = query.where({ score_overall: _.lt(80) })
    }
    const res = await query.orderBy('practiced_at', 'desc').limit(limit).get()
    const list = res.data || []

    // 按日期分组
    const today = dateStr(new Date())
    const yesterday = dateStr(new Date(Date.now() - 24 * 3600 * 1000))
    const grouped = { today: [], yesterday: [], earlier: [] }
    list.forEach((r) => {
      const ds = r.practiced_at ? dateStr(new Date(r.practiced_at)) : ''
      const item = {
        _id: r._id,
        sentence_id: r.sentence_id,
        text: r.sentence_body || '',
        time: r.practiced_at,
        durationSec: Math.round((r.duration_ms || 0) / 1000),
        score: r.score_overall || 0,
        audioCloudID: r.audio_cloud_id || '',
      }
      if (ds === today) grouped.today.push(item)
      else if (ds === yesterday) grouped.yesterday.push(item)
      else grouped.earlier.push(item)
    })

    return { ok: true, data: { recordings: grouped, total: list.length } }
  } catch (err) {
    console.error('[getUserRecordings] error', err)
    return { ok: false, err: err.message, data: { recordings: { today: [], yesterday: [], earlier: [] } } }
  }
}
