// 云函数: getUserSkeletons - 用户已练过的公式列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const FALLBACK_FORMULAS = [
  { _id: 'praise-cause-emphasis', name: '归因强调型', speech_act: '赞美', slots: ['肯定成果', '归因对方', '表达依赖'], practiceCount: 12, progress: 80 },
  { _id: 'praise-detail-attribute', name: '具体细节型', speech_act: '感谢', slots: ['具体细节', '内化感悟', '真诚归功'], practiceCount: 10, progress: 65 },
  { _id: 'praise-observation', name: '具体观察型', speech_act: '赞美', slots: ['具体细节', '价值定性', '情感表达'], practiceCount: 8, progress: 55 },
  { _id: 'praise-progress-compare', name: '进步对比型', speech_act: '赞美', slots: ['进步对比', '具体亮点', '价值定性'], practiceCount: 6, progress: 40 },
  { _id: 'thanks-long-impact', name: '长期影响型', speech_act: '感谢', slots: ['具体细节', '长期影响', '真诚归功'], practiceCount: 4, progress: 25 },
  { _id: 'praise-counter-factual', name: '反事实型', speech_act: '赞美', slots: ['反事实假设', '凸显贡献'], practiceCount: 2, progress: 15 },
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, err: 'NO_OPENID' }

  try {
    // MVP 简化：直接返回 fallback（后期接入真实 user_skeleton_progress 集合）
    const filterSpeechAct = event.speechAct
    let list = FALLBACK_FORMULAS
    if (filterSpeechAct && filterSpeechAct !== 'all') {
      list = list.filter(f => f.speech_act === filterSpeechAct)
    }
    return { ok: true, data: { formulas: list, total: list.length } }
  } catch (err) {
    return { ok: false, err: err.message }
  }
}
