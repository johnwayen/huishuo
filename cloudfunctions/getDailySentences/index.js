// 云函数: getDailySentences
// 返回今天该用户练习的 3 句
// MVP 策略：取该用户尚未练习的 3 句赞美句子；不够则补
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const FALLBACK_SENTENCES = [
  {
    _id: 'praise-001',
    skeleton_id: 'praise-cause-emphasis',
    skeleton_name: '归因强调型',
    speech_act: '赞美',
    scene_category: '职场赞美',
    scene_title: '真诚地夸同事',
    scene_sub: '让对方感觉被看见，而不是客套',
    body: '这次方案能这么顺利推下来，真的是因为有你在中间帮忙协调，下次还得继续靠你。',
    slots: [
      { type: '肯定成果', text: '这次方案能这么顺利推下来', prosody: { stress: ['顺', '利'], emotion: '自然', tempo: '中' } },
      { type: '归因对方', text: '真的是因为有你在中间帮忙协调', prosody: { stress: ['真', '你'], emotion: '真诚', tempo: '慢', pauseAfter: 200 } },
      { type: '表达依赖', text: '下次还得继续靠你', prosody: { stress: ['靠'], emotion: '温暖', tempo: '中', tone: '上扬' } },
    ],
  },
  {
    _id: 'praise-002',
    skeleton_id: 'praise-detail-attribute',
    skeleton_name: '具体细节型',
    speech_act: '赞美',
    scene_category: '职场赞美',
    scene_title: '得体地谢领导',
    scene_sub: '让感谢有重量，不浮在表面',
    body: '您上次提的那个角度我回去想了好几天，确实打开了思路，这次能调整成这样真的多亏了您。',
    slots: [
      { type: '具体细节', text: '您上次提的那个角度我回去想了好几天', prosody: { stress: ['那', '好'], emotion: '真诚', tempo: '中慢' } },
      { type: '内化感悟', text: '确实打开了思路', prosody: { stress: ['确实', '打开'], emotion: '真诚', tempo: '中' } },
      { type: '真诚归功', text: '这次能调整成这样真的多亏了您', prosody: { stress: ['真的', '多亏'], emotion: '真诚', tempo: '中慢' } },
    ],
  },
  {
    _id: 'praise-003',
    skeleton_id: 'praise-progress-compare',
    skeleton_name: '进步对比型',
    speech_act: '赞美',
    scene_category: '职场赞美',
    scene_title: '让下属被看见',
    scene_sub: '不是"你真棒"，而是"我注意到了"',
    body: '你这个版本比上次清晰太多了，特别是开头那段铺垫，看完一眼就知道你想说什么。',
    slots: [
      { type: '进步对比', text: '你这个版本比上次清晰太多了', prosody: { stress: ['清晰', '太多'], emotion: '欣赏', tempo: '中' } },
      { type: '具体亮点', text: '特别是开头那段铺垫', prosody: { stress: ['特别', '开头'], emotion: '欣赏', tempo: '中' } },
      { type: '价值定性', text: '看完一眼就知道你想说什么', prosody: { stress: ['一眼', '知道'], emotion: '肯定', tempo: '中' } },
    ],
  },
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const sentenceCol = db.collection('sentence')
    let sentences = []

    // 1) 优先取 sentence 集合里 status:1 的赞美句
    try {
      const res = await sentenceCol
        .where({ status: 1, speech_act: '赞美' })
        .orderBy('created_at', 'desc')
        .limit(10)
        .get()
      sentences = res.data || []
    } catch (e) {
      // 集合可能不存在
      sentences = []
    }

    // 2) 过滤掉用户今天已练习的（如果有 user_practice 记录）
    if (OPENID && sentences.length > 0) {
      try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const practiced = await db.collection('user_practice')
          .where({ _openid: OPENID, practiced_at: _.gte(todayStart) })
          .field({ sentence_id: true })
          .get()
        const practicedIds = new Set((practiced.data || []).map(p => p.sentence_id))
        sentences = sentences.filter(s => !practicedIds.has(s._id))
      } catch (e) {}
    }

    // 3) 不够 3 句则用 fallback 补
    if (sentences.length < 3) {
      const have = new Set(sentences.map(s => s._id))
      for (const s of FALLBACK_SENTENCES) {
        if (sentences.length >= 3) break
        if (!have.has(s._id)) sentences.push(s)
      }
    }

    return {
      ok: true,
      data: { sentences: sentences.slice(0, 3) },
    }
  } catch (err) {
    console.error('[getDailySentences] error', err)
    return {
      ok: true,
      data: { sentences: FALLBACK_SENTENCES },
    }
  }
}
