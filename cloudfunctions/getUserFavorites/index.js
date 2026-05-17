// 云函数: getUserFavorites - 用户收藏的句子列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, err: 'NO_OPENID' }

  try {
    const favCol = db.collection('user_favorite')
    const sentenceCol = db.collection('sentence')

    const favRes = await favCol
      .where({ _openid: OPENID })
      .orderBy('favorited_at', 'desc')
      .limit(100)
      .get()
    const favs = favRes.data || []

    // 拉取句子详情
    const ids = favs.map(f => f.sentence_id)
    const sentences = []
    if (ids.length > 0) {
      try {
        // CloudDB 一次最多 20 个 _id 查询，分批
        for (let i = 0; i < ids.length; i += 20) {
          const batch = ids.slice(i, i + 20)
          const res = await sentenceCol.where({ _id: db.command.in(batch) }).get()
          sentences.push(...(res.data || []))
        }
      } catch (e) {}
    }

    // 组合（按 fav 顺序）
    const map = {}
    sentences.forEach(s => { map[s._id] = s })
    const list = favs.map(f => {
      const s = map[f.sentence_id] || {}
      return {
        _id: f._id,
        sentence_id: f.sentence_id,
        body: s.body || '',
        skeleton_name: s.skeleton_name || '',
        scene_category: s.scene_category || '',
        favorited_at: f.favorited_at,
      }
    })

    return { ok: true, data: { favorites: list, total: favs.length } }
  } catch (err) {
    console.error('[getUserFavorites] error', err)
    return { ok: false, err: err.message, data: { favorites: [], total: 0 } }
  }
}
