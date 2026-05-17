// 云函数: initDb — 一次性管理员脚本
// 用途: 创建 7 个 CloudDB 集合 + 导入种子数据（骨架 + slot 类型 + 句子）
// 调用方式: 部署后在云开发控制台手动调用一次
//
// 注意: CloudDB 集合需要在控制台先手动创建（云函数无权限创建集合）。
//       本函数仅负责导入种子数据。
//
// 7 个集合（必须提前在控制台创建）:
//   skeleton          - 骨架定义
//   slot_type         - slot 类型词汇表
//   sentence          - 句子库
//   user              - 用户表
//   user_practice     - 练习记录
//   user_favorite     - 收藏
//   user_skeleton_progress - 公式掌握进度

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const SKELETONS = [
  {
    _id: 'praise-cause-emphasis',
    name: '归因强调型',
    speech_act: '赞美',
    slot_sequence: ['肯定成果', '归因对方', '表达依赖'],
    good_scenarios: [
      '项目刚结束的复盘场合，公开复述对方的具体贡献',
      '公开场合（会议、群里）想表扬同事时',
      '想表达感谢但又不想显得做作或客套',
      '对方真的有具体的、可指认的贡献时',
    ],
    bad_scenarios: [
      { text: '对方贡献其实不大', reason: '会变成讽刺，听起来阴阳怪气' },
      { text: '私下深度感谢', reason: '这个骨架偏轻量级、公开化，私下要更走心' },
      { text: '对方比自己级别低很多', reason: '"还得继续靠你"容易显得讨好或客气' },
    ],
    status: 1,
  },
  {
    _id: 'praise-detail-attribute',
    name: '具体细节型',
    speech_act: '感谢',
    slot_sequence: ['具体细节', '内化感悟', '真诚归功'],
    good_scenarios: [
      '想感谢领导/前辈的某个具体指点',
      '对方提的建议你真的反复想过、内化过',
      '需要让对方感受到"我没有客套"的场合',
      '一对一的认真感谢',
    ],
    bad_scenarios: [
      { text: '对方提的只是泛泛建议', reason: '硬扯具体细节会显得虚假' },
      { text: '群里公开场合', reason: '细节化感谢更适合私下，公开会显得过于个人' },
    ],
    status: 1,
  },
  {
    _id: 'praise-progress-compare',
    name: '进步对比型',
    speech_act: '赞美',
    slot_sequence: ['进步对比', '具体亮点', '价值定性'],
    good_scenarios: [
      '下属/同事的某次输出明显比之前好',
      '看到对方做事方式有了明显进步',
      '不想说"你真棒"这种空洞夸奖时',
      '想让对方感觉"我真的注意到了你"',
    ],
    bad_scenarios: [
      { text: '对方一直水准就高', reason: '没有可对比的"上次"' },
      { text: '在初次合作场合', reason: '需要先有基线才能讲进步' },
    ],
    status: 1,
  },
]

const SLOT_TYPES = {
  '肯定成果': {
    category: '描述类',
    description: '用具体的、可指认的成果开头',
    generic_alternatives: [
      '这次方案能这么顺利推下来',
      '这件事能这么稳地搞定',
      '项目能落地这么干净',
      '结果能这么漂亮',
      '这次能推得这么顺',
      '你这一波操作真的稳',
    ],
  },
  '归因对方': {
    category: '归因类',
    description: '把成果归功于对方的具体行为',
    generic_alternatives: [
      '真的是因为有你在中间帮忙协调',
      '全靠你那次在群里帮忙打通',
      '真的多亏了你那个建议',
      '离不开你前期的铺垫',
      '没你那一句话肯定卡住',
    ],
  },
  '表达依赖': {
    category: '行动类',
    description: '表达未来还要依赖对方',
    generic_alternatives: [
      '下次还得继续靠你',
      '下次还得来麻烦你',
      '接下来这一摊还得拉你一起',
      '后面还得仰仗你',
    ],
  },
  '具体细节': {
    category: '描述类',
    description: '描述对方提的具体细节/角度',
    generic_alternatives: [
      '您上次提的那个角度我回去想了好几天',
      '上次您在会上随口说的那个点',
      '您那次给我讲的那个例子',
      '上次跟您聊完之后我反复琢磨',
    ],
  },
  '内化感悟': {
    category: '情感类',
    description: '表达自己内化吸收后的感悟',
    generic_alternatives: [
      '确实打开了思路',
      '突然就想通了',
      '才意识到原来可以这样看',
      '让我换了一个角度',
    ],
  },
  '真诚归功': {
    category: '归因类',
    description: '把现在的成果归功于对方',
    generic_alternatives: [
      '这次能调整成这样真的多亏了您',
      '能做到这一步真的离不开您那次点拨',
      '这次方向能对上，是因为您那时候提醒',
      '没您那一句话肯定卡住',
    ],
  },
  '进步对比': {
    category: '描述类',
    description: '把当前的表现和之前对比',
    generic_alternatives: [
      '你这个版本比上次清晰太多了',
      '比上一稿成熟了一个量级',
      '相比之前完全不一样了',
      '比之前稳了非常多',
    ],
  },
  '具体亮点': {
    category: '描述类',
    description: '点出对方具体做得好的某个点',
    generic_alternatives: [
      '特别是开头那段铺垫',
      '尤其是那个数据可视化做得很到位',
      '中间那段逻辑串得很顺',
      '收尾给得也很有力',
    ],
  },
  '价值定性': {
    category: '描述类',
    description: '对对方的工作做价值判断',
    generic_alternatives: [
      '看完一眼就知道你想说什么',
      '一看就是真功夫',
      '思路非常清楚',
      '完全 get 到点了',
    ],
  },
}

const SENTENCES = [
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
    audio_url: '',
    status: 1,
    created_at: new Date(),
  },
  {
    _id: 'praise-002',
    skeleton_id: 'praise-detail-attribute',
    skeleton_name: '具体细节型',
    speech_act: '感谢',
    scene_category: '感谢',
    scene_title: '得体地谢领导',
    scene_sub: '让感谢有重量，不浮在表面',
    body: '您上次提的那个角度我回去想了好几天，确实打开了思路，这次能调整成这样真的多亏了您。',
    slots: [
      { type: '具体细节', text: '您上次提的那个角度我回去想了好几天', prosody: { stress: ['那', '好'], emotion: '真诚', tempo: '中慢' } },
      { type: '内化感悟', text: '确实打开了思路', prosody: { stress: ['确实', '打开'], emotion: '真诚', tempo: '中' } },
      { type: '真诚归功', text: '这次能调整成这样真的多亏了您', prosody: { stress: ['真的', '多亏'], emotion: '真诚', tempo: '中慢' } },
    ],
    audio_url: '',
    status: 1,
    created_at: new Date(),
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
    audio_url: '',
    status: 1,
    created_at: new Date(),
  },
]

async function upsert(collectionName, _id, data) {
  const col = db.collection(collectionName)
  try {
    // 看 doc 是否存在
    await col.doc(_id).get()
    // 存在则 update
    await col.doc(_id).set({ data })
    return { action: 'update' }
  } catch (e) {
    // 不存在则 add（用 _id 指定 doc id）
    try {
      await col.add({ data: { _id, ...data } })
      return { action: 'add' }
    } catch (e2) {
      return { action: 'fail', err: e2.message }
    }
  }
}

exports.main = async (event, context) => {
  const result = {
    skeletons: { ok: 0, fail: 0, errors: [] },
    slot_types: { ok: 0, fail: 0, errors: [] },
    sentences: { ok: 0, fail: 0, errors: [] },
  }

  // 导入骨架
  for (const sk of SKELETONS) {
    const { _id, ...rest } = sk
    const r = await upsert('skeleton', _id, rest)
    if (r.action === 'fail') {
      result.skeletons.fail++
      result.skeletons.errors.push(`${_id}: ${r.err}`)
    } else {
      result.skeletons.ok++
    }
  }

  // 导入 slot 类型
  for (const [type, def] of Object.entries(SLOT_TYPES)) {
    const r = await upsert('slot_type', type, def)
    if (r.action === 'fail') {
      result.slot_types.fail++
      result.slot_types.errors.push(`${type}: ${r.err}`)
    } else {
      result.slot_types.ok++
    }
  }

  // 导入句子
  for (const s of SENTENCES) {
    const { _id, ...rest } = s
    const r = await upsert('sentence', _id, rest)
    if (r.action === 'fail') {
      result.sentences.fail++
      result.sentences.errors.push(`${_id}: ${r.err}`)
    } else {
      result.sentences.ok++
    }
  }

  return { ok: true, data: result }
}
