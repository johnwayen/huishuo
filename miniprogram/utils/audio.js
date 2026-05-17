/**
 * 录音 + 播放 + ASR + TTS 封装
 * - 使用微信同声传译插件做 ASR
 * - 使用 wx.createInnerAudioContext 播放
 * - 录音存到云存储
 */

const plugin = requirePlugin('WechatSI')
const { uploadFile } = require('./cloud')

let recognitionManager = null

/**
 * 获取语音识别管理器（懒加载）
 */
function getRecognitionManager() {
  if (recognitionManager) return recognitionManager
  recognitionManager = plugin.getRecordRecognitionManager()
  return recognitionManager
}

/**
 * 开始录音 + 同步 ASR 识别
 * @param {object} cb { onStart, onStop, onError, onRecognize }
 * @returns 控制函数 { stop }
 */
function startRecognize(cb = {}) {
  const manager = getRecognitionManager()

  manager.onStart = (res) => {
    console.log('[audio] 录音开始', res)
    cb.onStart && cb.onStart(res)
  }
  manager.onRecognize = (res) => {
    cb.onRecognize && cb.onRecognize(res.result || '')
  }
  manager.onStop = (res) => {
    // res: { result, tempFilePath, duration, fileSize }
    console.log('[audio] 录音结束', res)
    cb.onStop && cb.onStop(res)
  }
  manager.onError = (err) => {
    console.error('[audio] 录音错误', err)
    cb.onError && cb.onError(err)
  }

  manager.start({
    duration: 30000, // 最长 30s
    lang: 'zh_CN',
  })

  return {
    stop: () => manager.stop(),
  }
}

/**
 * 通过微信同声传译做 TTS
 * @param {string} text 文本
 * @returns Promise<{ filename, expired_time }>
 */
function textToSpeech(text) {
  return new Promise((resolve, reject) => {
    plugin.textToSpeech({
      lang: 'zh_CN',
      content: text,
      success: (res) => {
        // res: { filename, expired_time, retcode }
        resolve(res)
      },
      fail: reject,
    })
  })
}

/**
 * 播放本地或远程音频
 * @param {string} src 路径（http / cloud:// / temp）
 * @param {object} cb { onPlay, onEnded, onError }
 * @returns context 实例（可主动 .stop() / .pause()）
 */
function playAudio(src, cb = {}) {
  const ctx = wx.createInnerAudioContext()
  ctx.src = src
  ctx.onPlay(() => cb.onPlay && cb.onPlay())
  ctx.onEnded(() => {
    cb.onEnded && cb.onEnded()
    ctx.destroy()
  })
  ctx.onError((err) => {
    console.error('[audio] 播放错误', err)
    cb.onError && cb.onError(err)
    ctx.destroy()
  })
  ctx.play()
  return ctx
}

/**
 * 上传录音文件到云存储
 * @param {string} tempFilePath 本地临时路径
 * @param {string} userOpenid 用户 openid（用于路径分区）
 * @returns Promise<{ ok, fileID }>
 */
async function uploadRecording(tempFilePath, userOpenid = 'anon') {
  const date = new Date().toISOString().slice(0, 10)
  const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  const cloudPath = `recordings/${userOpenid}/${date}/${uniqueId}.mp3`
  return await uploadFile(tempFilePath, cloudPath)
}

module.exports = {
  startRecognize,
  textToSpeech,
  playAudio,
  uploadRecording,
}
