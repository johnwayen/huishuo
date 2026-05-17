// 云函数: updateStreak
// 用户完成一句练习 / 更新 streak
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { sentenceId } = event
  if (!OPENID) return { ok: false, err: 'NO_OPENID' }

  try {
    const now = new Date()
    const todayStr = dateStr(now)

    // 记录练习（如果传了 sentenceId）
    if (sentenceId) {
      try {
        await db.collection('user_practice').add({
          data: {
            _openid: OPENID,
            sentence_id: sentenceId,
            practiced_at: now,
          },
        })
      } catch (e) {
        // 集合不存在或权限不够，忽略
      }
    }

    // 更新 user.streak
    const userCol = db.collection('user')
    const userRes = await userCol.where({ _openid: OPENID }).limit(1).get()
    const user = userRes.data[0]
    if (!user) return { ok: false, err: 'USER_NOT_FOUND' }

    const lastStr = user.streak_last_at ? dateStr(new Date(user.streak_last_at)) : null
    let newStreak = user.streak_count || 0

    if (lastStr === todayStr) {
      // 今天已经记过，streak 不变
    } else {
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000)
      const yesterdayStr = dateStr(yesterday)
      if (lastStr === yesterdayStr) {
        newStreak += 1
      } else {
        // 断签了，重置为 1
        newStreak = 1
      }
    }

    await userCol.doc(user._id).update({
      data: { streak_count: newStreak, streak_last_at: now },
    })

    return { ok: true, data: { streak: newStreak } }
  } catch (err) {
    console.error('[updateStreak] error', err)
    return { ok: false, err: err.message }
  }
}
