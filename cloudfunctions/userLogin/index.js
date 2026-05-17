// 云函数: userLogin
// 触发登录 / 创建用户记录 / 返回 streak
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { ok: false, err: 'NO_OPENID' }
  }

  try {
    // 查用户
    const userCol = db.collection('user')
    const userRes = await userCol.where({ _openid: OPENID }).limit(1).get()
    let user = userRes.data[0]

    // 首次登录则创建
    if (!user) {
      const now = new Date()
      const created = await userCol.add({
        data: {
          _openid: OPENID,
          nickname: '',
          avatar: '',
          member_expire_at: null,
          streak_count: 0,
          streak_last_at: null,
          created_at: now,
          last_login_at: now,
        },
      })
      user = {
        _id: created._id,
        _openid: OPENID,
        nickname: '',
        avatar: '',
        streak_count: 0,
        streak_last_at: null,
        member_expire_at: null,
      }
    } else {
      // 更新 last_login_at
      await userCol.doc(user._id).update({ data: { last_login_at: new Date() } })
    }

    return {
      ok: true,
      user: {
        openid: OPENID,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      streak: {
        count: user.streak_count || 0,
        lastDate: user.streak_last_at,
      },
    }
  } catch (err) {
    console.error('[userLogin] error', err)
    return { ok: false, err: err.message }
  }
}
