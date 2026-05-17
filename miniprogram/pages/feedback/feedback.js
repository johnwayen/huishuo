// pages/feedback/feedback.js — AI 点评
const app = getApp()
const { getSentenceById, SEED_SENTENCES } = require('../../data/seed')
const { callFunction } = require('../../utils/cloud')
const { playAudio, textToSpeech } = require('../../utils/audio')
const storage = require('../../utils/storage')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: true,
    sentence: null,
    result: null,
    activeTrack: 'user',
    playing: false,
  },

  async onLoad(query) {
    this.computeNavBar()
    const id = query.id
    const list = app.globalData.todaySentences || SEED_SENTENCES
    const idx = list.findIndex((s) => s._id === id)
    const sentence = getSentenceById(id) || list[0] || SEED_SENTENCES[0]
    sentence.index = idx >= 0 ? idx : 0
    sentence.total = list.length || 3
    this.setData({ sentence })
    await this.runAnalysis()
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu ? (menu.top - statusBarHeight) * 2 + menu.height : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  async runAnalysis() {
    const recording = storage.get('lastRecording')
    let result

    if (recording && recording.audioCloudID) {
      try {
        const res = await callFunction('analyzeAudio', {
          sentenceId: this.data.sentence._id,
          transcript: recording.transcript,
          audioCloudID: recording.audioCloudID,
          durationMs: recording.durationMs,
        }, { timeout: 25000 })
        if (res.ok && res.data) {
          result = this.normalizeResult(res.data, recording)
        }
      } catch (err) {
        console.warn('[feedback] AI 评分失败', err)
      }
    }

    if (!result) {
      result = this.makeMockResult(recording)
    }

    this.setData({ loading: false, result })
  },

  normalizeResult(raw, recording) {
    const userDurSec = Math.max(1, Math.floor((recording?.durationMs || 6000) / 1000))
    const aiDurSec = userDurSec + 1
    return {
      title: raw.title || '读得不错，差一点情绪',
      overall: raw.overall_score || 82,
      progressText: raw.progressText || '比上一句进步 +6',
      scores: [
        { key: 'fluent', label: '流利度', desc: '语速、卡顿、连贯', value: raw.scores?.流利度 || raw.scores?.fluent || 5 },
        { key: 'structure', label: '结构完整', desc: '三段骨架是否到位', value: raw.scores?.结构 || raw.scores?.structure || 4 },
        { key: 'emotion', label: '情感饱满', desc: '真诚感、温度', value: raw.scores?.情感 || raw.scores?.emotion || 3 },
      ],
      feedback: (raw.feedback || []).map((f) => ({
        time: f.time,
        text: f.text,
        type: f.type || '',
      })),
      userDur: `0:${String(userDurSec).padStart(2, '0')}`,
      aiDur: `0:${String(aiDurSec).padStart(2, '0')}`,
    }
  },

  makeMockResult(recording) {
    const sentence = this.data.sentence
    const userDurSec = Math.max(1, Math.floor((recording?.durationMs || 6000) / 1000))
    const aiDurSec = userDurSec + 1
    const slot1 = sentence?.slots?.[0]?.text || ''
    const slot2Type = sentence?.slots?.[1]?.type || '归因'
    const slot3 = sentence?.slots?.[2]?.text || ''

    return {
      title: '读得不错，差一点情绪',
      overall: 82,
      progressText: '比上一句进步 +6',
      scores: [
        { key: 'fluent', label: '流利度', desc: '语速、卡顿、连贯', value: 5 },
        { key: 'structure', label: '结构完整', desc: '三段骨架是否到位', value: 4 },
        { key: 'emotion', label: '情感饱满', desc: '真诚感、温度', value: 3 },
      ],
      feedback: [
        {
          time: `第 1 段 · 0:00-${Math.floor(userDurSec / 3)}`,
          text: `"${slot1.slice(0, 8)}..." 节奏抓得很准，肯定感很到位。`,
          type: 'good',
        },
        {
          time: `第 2 段（${slot2Type}）`,
          text: `读起来稍快，是真诚感最容易丢的地方，试着放慢半拍。`,
        },
        {
          time: `第 3 段（结尾）`,
          text: `"${slot3.slice(-4)}" 收尾偏平，可以语调微微上扬，会显得是真心想合作。`,
        },
      ],
      userDur: `0:${String(userDurSec).padStart(2, '0')}`,
      aiDur: `0:${String(aiDurSec).padStart(2, '0')}`,
    }
  },

  async onPlayUser() {
    if (this.data.playing && this.data.activeTrack === 'user') {
      this.stopPlay()
      return
    }
    this.stopPlay()
    const recording = storage.get('lastRecording')
    const path = recording?.audioPath
    if (!path) {
      wx.showToast({ title: '录音不可用', icon: 'none' })
      return
    }
    this.setData({ activeTrack: 'user', playing: true })
    this._playCtx = playAudio(path, {
      onEnded: () => this.stopPlay(),
      onError: () => this.stopPlay(),
    })
  },

  async onPlayAi() {
    if (this.data.playing && this.data.activeTrack === 'ai') {
      this.stopPlay()
      return
    }
    this.stopPlay()
    this.setData({ activeTrack: 'ai', playing: true })
    const url = this.data.sentence?.audio_url
    if (url) {
      this._playCtx = playAudio(url, {
        onEnded: () => this.stopPlay(),
        onError: () => this.stopPlay(),
      })
    } else {
      try {
        const tts = await textToSpeech(this.data.sentence.body)
        if (tts?.filename) {
          this._playCtx = playAudio(tts.filename, {
            onEnded: () => this.stopPlay(),
            onError: () => this.stopPlay(),
          })
        } else {
          setTimeout(() => this.stopPlay(), 3000)
        }
      } catch (e) {
        setTimeout(() => this.stopPlay(), 3000)
      }
    }
  },

  stopPlay() {
    if (this._playCtx) {
      try { this._playCtx.destroy() } catch (e) {}
      this._playCtx = null
    }
    this.setData({ playing: false })
  },

  onRetry() {
    wx.navigateBack({ delta: 1 })
  },

  async onNext() {
    const sentence = this.data.sentence
    const list = app.globalData.todaySentences || SEED_SENTENCES
    const currentIdx = list.findIndex((s) => s._id === sentence._id)

    callFunction('updateStreak', { sentenceId: sentence._id, action: 'complete' })

    if (currentIdx < list.length - 1) {
      const nextId = list[currentIdx + 1]._id
      app.globalData.nextSentenceId = nextId
      wx.navigateBack({ delta: 2 })
    } else {
      wx.redirectTo({ url: '/pages/celebration/celebration' })
    }
  },

  onClose() {
    wx.navigateBack({ delta: 2 })
  },

  onUnload() {
    this.stopPlay()
  },
})
