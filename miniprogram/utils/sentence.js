/**
 * 句子 / slot / 骨架 相关辅助
 */

/**
 * 把 sentence + slots 拼装成可渲染的 segments 数组
 * 用于 wxml 里循环渲染 <text class="seg seg-{{i+1}}">
 *
 * @param {object} sentence 数据库里的句子对象
 * @returns Array<{ text, slotType, segIdx, separator }>
 */
function buildSegments(sentence) {
  if (!sentence || !sentence.slots) return []
  const result = []
  sentence.slots.forEach((slot, i) => {
    result.push({
      text: slot.text || '',
      slotType: slot.type || '',
      segIdx: i + 1, // 1-based for CSS class seg-1/2/3
      isLast: i === sentence.slots.length - 1,
    })
  })
  return result
}

/**
 * 把句子原文 + slot stress 标注 拼成渲染用 char 数组
 * 用于跟读页 / 骨架页"怎么读" tab：每个字带 isStress / hasPause
 *
 * @param {object} sentence
 * @returns Array<{ ch, isStress, pauseAfter }>
 */
function buildAnnotatedChars(sentence) {
  if (!sentence || !sentence.slots) return []
  const stressSet = new Set()
  const pauseAfter = new Set() // 字位置（accumulated index）

  let cursor = 0
  sentence.slots.forEach((slot, slotIdx) => {
    const text = slot.text || ''
    const prosody = slot.prosody || {}
    // 标记重音
    if (Array.isArray(prosody.stress)) {
      prosody.stress.forEach((sChar) => {
        // 找 sChar 在 slot.text 里的位置
        for (let i = 0; i < text.length; i++) {
          if (text[i] === sChar) {
            stressSet.add(cursor + i)
          }
        }
      })
    }
    cursor += text.length
    // 句尾停顿
    if (slotIdx < sentence.slots.length - 1) {
      pauseAfter.add(cursor - 1) // 当前 slot 最后一个字之后停顿
    }
  })

  // 组合所有 slot 文本为一个字数组
  const allText = sentence.slots.map((s) => s.text || '').join('')
  return allText.split('').map((ch, idx) => ({
    ch,
    isStress: stressSet.has(idx),
    pauseAfter: pauseAfter.has(idx),
  }))
}

/**
 * 计算今日进度
 */
function calcTodayProgress(practices = [], today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10)
  const todayCount = practices.filter((p) => {
    const d = p.practiced_at ? new Date(p.practiced_at) : null
    return d && d.toISOString().slice(0, 10) === todayStr
  }).length
  return { done: Math.min(todayCount, 3), total: 3 }
}

module.exports = {
  buildSegments,
  buildAnnotatedChars,
  calcTodayProgress,
}
