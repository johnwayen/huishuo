// pages/record/record.js — 跟读 · 长按录音
const app = getApp()
const { getSentenceById, SEED_SENTENCES } = require('../../data/seed')
const { startRecognize, uploadRecording, playAudio } = require('../../utils/audio')
const { buildAnnotatedChars } = require('../../utils/sentence')
const { callFunction } = require('../../utils/cloud')
const { fmtDurationFine } = require('../../utils/format')
const storage = require('../../utils/storage')

// 伪造波形（50 根，固定 seed 保证视觉一致）
function genWave(seed, count = 50) {
  let s = seed
  const out = []
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280
    out.push(Math.floor(8 + (s / 233280) * 48))
  }
  return out
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    sentence: null,
    annotated: [],

    aiWaveBars: [],
    userWaveBars: [],

    recState: 'idle', // idle / recording / recorded
    recTip: '长按下方按钮录音',
    recTimerText: '00:00.00',
    hasRecorded: false,

    aiPlaying: false,
    aiPlayProgress: 0,
    userPlaying: false,
    userPlayProgress: 0,

    transcript: '',   // ASR 转写
    audioPath: '',    // 本地录音文件
    audioCloudID: '', // 上传后云端 ID
    audioDurationMs: 0,
  },

  async onLoad(query) {
    this.computeNavBar()
    const id = query.id
    const list = app.globalData.todaySentences || SEED_SENTENCES
    const idx = list.findIndex((s) => s._id === id)
    const sentence = getSentenceById(id) || list[0] || SEED_SENTENCES[0]
    sentence.index = idx >= 0 ? idx : 0
    sentence.total = list.length || 3
    const annotated = buildAnnotatedChars(sentence)
    this.setData({
      sentence,
      annotated,
      aiWaveBars: genWave(42),
      userWaveBars: genWave(17),
    })
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu ? (menu.top - statusBarHeight) * 2 + menu.height : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },

  /* ============ 录音 ============ */
  onRecordStart() {
    if (this.data.recState === 'recording' || this.data.hasRecorded) return

    // 先做授权检查
    wx.authorize({
      scope: 'scope.record',
      success: () => this._actuallyStartRecord(),
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '录音是会说的核心功能，需要授权使用麦克风。',
          confirmText: '去开启',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          },
        })
      },
    })
  },

  _actuallyStartRecord() {
    this._recStartAt = Date.now()
    this.setData({
      recState: 'recording',
      recTip: '松开结束',
      transcript: '',
    })
    this._timer = setInterval(() => {
      const elapsed = Date.now() - this._recStartAt
      this.setData({ recTimerText: fmtDurationFine(elapsed) })
    }, 60)

    this._recCtrl = startRecognize({
      onRecognize: (text) => {
        // 实时转写（中间结果），可选展示
      },
      onStop: (res) => {
        this._finishRecord(res)
      },
      onError: (err) => {
        this._timer && clearInterval(this._timer)
        this.setData({
          recState: 'idle',
          recTip: '录音失败，重试一下',
          recTimerText: '00:00.00',
        })
        wx.showToast({ title: '录音失败', icon: 'none' })
      },
    })
  },

  onRecordEnd() {
    if (this.data.recState !== 'recording') return
    // 触发同声传译 stop
    if (this._recCtrl) this._recCtrl.stop()
    // timer 会在 onStop 回调里清除
  },

  async _finishRecord(res) {
    if (this._timer) clearInterval(this._timer)
    const duration = Date.now() - this._recStartAt
    const transcript = res.result || ''
    const tempFilePath = res.tempFilePath || ''

    this.setData({
      recState: 'recorded',
      hasRecorded: true,
      recTip: '点下方查看 AI 反馈',
      recTimerText: `录音完成 · ${Math.max(1, Math.floor(duration / 1000))}s`,
      transcript,
      audioPath: tempFilePath,
      audioDurationMs: duration,
    })

    // 后台上传到云存储（不阻塞 UI）
    const user = app.globalData.userInfo || {}
    if (tempFilePath) {
      uploadRecording(tempFilePath, user.openid || 'anon').then((up) => {
        if (up.ok) {
          this.setData({ audioCloudID: up.fileID })
        }
      })
    }
  },

  /* ============ AI 播放（模拟波形高亮）============ */
  onTapAiPlay() {
    if (this.data.aiPlaying) {
      this._stopAiPlay()
      return
    }
    this.setData({ aiPlaying: true, aiPlayProgress: 0 })
    const total = this.data.aiWaveBars.length
    const duration = 2800
    const interval = duration / total
    let idx = 0
    this._aiTick = setInterval(() => {
      idx++
      this.setData({ aiPlayProgress: idx })
      if (idx >= total) {
        this._stopAiPlay()
      }
    }, interval)

    // 同时触发实际 TTS 播放（如果有 audio_url）
    if (this.data.sentence.audio_url) {
      this._aiAudio = playAudio(this.data.sentence.audio_url, {
        onEnded: () => this._stopAiPlay(),
      })
    }
  },

  _stopAiPlay() {
    if (this._aiTick) clearInterval(this._aiTick)
    if (this._aiAudio) {
      try { this._aiAudio.destroy() } catch (e) {}
      this._aiAudio = null
    }
    this.setData({ aiPlaying: false, aiPlayProgress: 0 })
  },

  /* ============ 用户回放 ============ */
  onTapUserPlay() {
    if (!this.data.hasRecorded) return
    if (this.data.userPlaying) {
      this._stopUserPlay()
      return
    }
    this.setData({ userPlaying: true, userPlayProgress: 0 })
    const total = this.data.userWaveBars.length
    const duration = Math.max(2000, this.data.audioDurationMs)
    const interval = duration / total
    let idx = 0
    this._userTick = setInterval(() => {
      idx++
      this.setData({ userPlayProgress: idx })
      if (idx >= total) this._stopUserPlay()
    }, interval)

    if (this.data.audioPath) {
      this._userAudio = playAudio(this.data.audioPath, {
        onEnded: () => this._stopUserPlay(),
      })
    }
  },

  _stopUserPlay() {
    if (this._userTick) clearInterval(this._userTick)
    if (this._userAudio) {
      try { this._userAudio.destroy() } catch (e) {}
      this._userAudio = null
    }
    this.setData({ userPlaying: false, userPlayProgress: 0 })
  },

  /* ============ 跳点评页 ============ */
  async onTapNext() {
    const s = this.data.sentence
    // 把当前数据塞入 storage，点评页直接取
    storage.set('lastRecording', {
      sentenceId: s._id,
      transcript: this.data.transcript,
      audioCloudID: this.data.audioCloudID,
      audioPath: this.data.audioPath,
      durationMs: this.data.audioDurationMs,
    }, 5 * 60 * 1000) // 5 分钟有效

    wx.navigateTo({
      url: `/pages/feedback/feedback?id=${s._id}`,
    })
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
    if (this._aiTick) clearInterval(this._aiTick)
    if (this._userTick) clearInterval(this._userTick)
    if (this._aiAudio) try { this._aiAudio.destroy() } catch (e) {}
    if (this._userAudio) try { this._userAudio.destroy() } catch (e) {}
  },
})
