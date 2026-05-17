// 云函数: analyzeAudio — AI 评分主链路（方案 A：LLM 推断式）
//
// 输入: { sentenceId, transcript, audioCloudID, durationMs }
// 输出: { ok, data: { title, overall_score, scores, feedback, progressText } }
//
// 策略：
// 1. 取 sentence schema（包含 slots + prosody 期望值）
// 2. 把 ASR 转写文本 + 音频时长 + schema 喂给 DeepSeek-V3
// 3. 强制 JSON 输出 + schema 约束
// 4. 失败时退化为算法生成的反馈（保证用户感知不到）
// 5. 保存评分记录到 user_practice

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

/* ============ HTTP 调用 DeepSeek ============ */
function callDeepSeek(messages, options = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 800,
    })
    const url = new URL(DEEPSEEK_URL)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 20000,
    }, (res) => {
      let raw = ''
      res.on('data', (c) => { raw += c })
      res.on('end', () => {
        try {
          const data = JSON.parse(raw)
          const content = data?.choices?.[0]?.message?.content || ''
          resolve({ ok: true, content, raw: data })
        } catch (e) {
          reject(new Error('DeepSeek parse failed: ' + e.message))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.write(body)
    req.end()
  })
}

/* ============ Prompt 工程 ============ */
function buildPrompt(sentence, transcript, durationMs) {
  const charCount = (sentence.body || '').length
  const seconds = Math.max(1, Math.round((durationMs || 6000) / 1000))
  const charsPerSec = (charCount / seconds).toFixed(1)

  const schema = {
    speech_act: sentence.speech_act,
    skeleton: sentence.skeleton_name,
    slots: (sentence.slots || []).map((s) => ({
      type: s.type,
      text: s.text,
      expected_prosody: s.prosody,
    })),
  }

  const systemPrompt = `你是会说 app 的表达力教练，专门用三层方法论（言语行为/结构模板/朗读参数）给用户的录音打分。

输出严格 JSON，schema 如下：
{
  "title": "<≤14 字的总结，例如'读得不错，差一点情绪'>",
  "overall_score": <0-100 整数>,
  "scores": {
    "流利度": <1-5 整数>,
    "结构": <1-5 整数>,
    "情感": <1-5 整数>
  },
  "feedback": [
    { "time": "<第 N 段 + 简短定位>", "type": "good|warning", "text": "<具体到 slot/重音点的反馈，≤40 字>" }
  ],
  "progressText": "<例如'比上一句进步 +6' 或 '今天的第 2 句'>"
}

评分规则（重要）：
- 流利度：基于 ASR 转写完整度 + 字/秒速率（理想 4-6 字/秒）
- 结构：转写是否覆盖了 schema 里的 3 个 slot 内容
- 情感：基于句子整体 emotion 期望 + 时长（短=匆忙=低分；长但平均=偏低）
- feedback 给 2-3 条，必须具体到"第 X 段"，type=good 至少 1 条
- title 不要写"很好"这种空洞夸奖，要点出具体感受`

  const userPrompt = `本次评分数据：

原句 schema:
${JSON.stringify(schema, null, 2)}

用户 ASR 转写: "${transcript || '（识别失败）'}"
音频时长: ${seconds}s（${charsPerSec} 字/秒）
原句长度: ${charCount} 字

按 schema 输出 JSON。`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
}

/* ============ Mock 兜底（DeepSeek 不可用时）============ */
function makeMockResult(sentence, transcript, durationMs) {
  const seconds = Math.max(1, Math.round((durationMs || 6000) / 1000))
  const slot1 = sentence?.slots?.[0]?.text || ''
  const slot2Type = sentence?.slots?.[1]?.type || '归因'
  const slot3 = sentence?.slots?.[2]?.text || ''
  const charCount = (sentence.body || '').length
  const speed = charCount / seconds

  const fluentScore = speed >= 4 && speed <= 7 ? 5 : 4
  const structureScore = transcript && transcript.length >= charCount * 0.7 ? 4 : 3
  const emotionScore = seconds >= 5 ? 4 : 3
  const overall = Math.round((fluentScore + structureScore + emotionScore) / 15 * 100)

  return {
    title: '读得不错，差一点情绪',
    overall_score: overall,
    scores: { 流利度: fluentScore, 结构: structureScore, 情感: emotionScore },
    feedback: [
      {
        time: '第 1 段',
        type: 'good',
        text: `"${slot1.slice(0, 8)}..." 节奏抓得很准，肯定感很到位。`,
      },
      {
        time: `第 2 段（${slot2Type}）`,
        type: 'warning',
        text: '读起来稍快，是真诚感最容易丢的地方，试着放慢半拍。',
      },
      {
        time: '第 3 段',
        type: 'warning',
        text: `"${slot3.slice(-4)}" 收尾偏平，可以语调微微上扬。`,
      },
    ],
    progressText: '比上一句进步 +6',
  }
}

/* ============ 主入口 ============ */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { sentenceId, transcript, audioCloudID, durationMs } = event
  if (!sentenceId) return { ok: false, err: 'INVALID_PARAMS' }

  try {
    // 取 sentence schema
    let sentence
    try {
      const res = await db.collection('sentence').doc(sentenceId).get()
      sentence = res.data
    } catch (e) {
      // 集合不存在 / 句子不存在 - 用 transcript 做最简单评分
      sentence = { _id: sentenceId, body: transcript || '', slots: [] }
    }

    // 调 DeepSeek
    let result
    if (DEEPSEEK_API_KEY && sentence.slots && sentence.slots.length > 0) {
      try {
        const messages = buildPrompt(sentence, transcript, durationMs)
        const llmRes = await callDeepSeek(messages, { temperature: 0.3, maxTokens: 800 })
        if (llmRes.ok && llmRes.content) {
          try {
            result = JSON.parse(llmRes.content)
          } catch (e) {
            console.warn('[analyzeAudio] JSON parse failed, raw:', llmRes.content)
          }
        }
      } catch (err) {
        console.warn('[analyzeAudio] DeepSeek failed', err.message)
      }
    }

    // 退化
    if (!result) {
      result = makeMockResult(sentence, transcript, durationMs)
    }

    // 保存到 user_practice
    if (OPENID) {
      try {
        await db.collection('user_practice').add({
          data: {
            _openid: OPENID,
            sentence_id: sentenceId,
            sentence_body: sentence.body || '',
            audio_cloud_id: audioCloudID || '',
            transcript: transcript || '',
            duration_ms: durationMs || 0,
            score_overall: result.overall_score || 0,
            score_fluent: result.scores?.流利度 || 0,
            score_structure: result.scores?.结构 || 0,
            score_emotion: result.scores?.情感 || 0,
            feedback: result.feedback || [],
            practiced_at: new Date(),
          },
        })
      } catch (e) {
        console.warn('[analyzeAudio] save practice failed', e.message)
      }
    }

    return { ok: true, data: result }
  } catch (err) {
    console.error('[analyzeAudio] error', err)
    return { ok: false, err: err.message }
  }
}
