// 云函数: saveFavorite
// 收藏 / 取消收藏一条句子
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { sentenceId, action } = event
  if (!OPENID || !sentenceId) return { ok: false, err: 'INVALID_PARAMS' }

  try {
    const col = db.collection('user_favorite')
    if (action === 'add') {
      // 防重复
      const exists = await col.where({ _openid: OPENID, sentence_id: sentenceId }).count()
      if (exists.total === 0) {
        await col.add({ data: {
          _openid: OPENID,
          sentence_id: sentenceId,
          favorited_at: new Date(),
        }})
      }
    } else if (action === 'remove') {
      const res = await col.where({ _openid: OPENID, sentence_id: sentenceId }).get()
      for (const r of res.data) await col.doc(r._id).remove()
    }
    return { ok: true }
  } catch (err) {
    console.error('[saveFavorite] error', err)
    return { ok: false, err: err.message }
  }
}
