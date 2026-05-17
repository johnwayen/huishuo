// pages/index/index.js — 首屏 · 看到句子
const app = getApp()
const { SEED_SENTENCES } = require('../../data/seed')
const { callFunction } = require('../../utils/cloud')
const { textToSpeech, playAudio } = require('../../utils/audio')
const storage = require('../../utils/storage')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    streak: { count: 0 },

    sentences: [],
    currentIdx: 0,
    favorites: {},
    popIds: {},

    listeningId: null,
    currentSegIdx: -1,

    showLaunch: true,
    launchHidden: false,
    launchAnim: false,

    showTutorial: false,
    tutorialStep: 0,
    tutorialSteps: [
      { title: '👆 左右滑动，切换今天的 3 句', target: 'sentence' },
      { title: '💡 点开"骨架"，看为什么这么说好', target: 'structure' },
      { title: '🎙 准备好了，点这里开口说', target: 'record' },
    ],
    spot: { left: 0, top: 0, width: 0, height: 0 },
    msg: { top: 0 },
  },

  async onLoad() {
    this.computeNavBar()
    await this.loadSentences()
    this.loadStreak()
    this.loadFavorites()
    this.runLaunchSequence()
  },

  onShow() {
    this.loadStreak()
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu
      ? (menu.top - statusBarHeight) * 2 + menu.height
      : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  async loadSentences() {
    let sentences = null
    try {
      const res = await callFunction('getDailySentences', {})
      if (res.ok && Array.isArray(res.data?.sentences) && res.data.sentences.length >= 3) {
        sentences = res.data.sentences
      }
    } catch (e) {}
    if (!sentences) sentences = SEED_SENTENCES
    this.setData({ sentences })
    app.globalData.todaySentences = sentences
  },

  loadStreak() {
    const streak = app.globalData.streak || { count: 7 }
    this.setData({ streak })
  },

  loadFavorites() {
    const stored = storage.get('favorites', {})
    this.setData({ favorites: stored })
  },

  /* ===== Launch + Tutorial 序列 ===== */
  runLaunchSequence() {
    // Trigger anim after 1 frame
    setTimeout(() => this.setData({ launchAnim: true }), 30)
    // 启动页停留 3.4s 后开始淡出
    setTimeout(() => this.setData({ launchHidden: true }), 3400)
    // 0.6s 后销毁 splash
    setTimeout(() => this.setData({ showLaunch: false }), 4000)

    // Tutorial: 仅首次启动
    const hasSeenTutorial = storage.get('hasSeenTutorial', false)
    if (!hasSeenTutorial) {
      setTimeout(() => {
        this.setData({ showTutorial: true })
        wx.nextTick(() => this.placeSpotlight(0))
      }, 4200)
    }
  },

  placeSpotlight(stepIdx) {
    const step = this.data.tutorialSteps[stepIdx]
    let selector = ''
    if (step.target === 'sentence') selector = '.slide .sentence-card'
    else if (step.target === 'structure') selector = '.slide .structure-hint'
    else if (step.target === 'record') selector = '.btn-record'
    if (!selector) return

    wx.createSelectorQuery()
      .select(selector)
      .boundingClientRect()
      .exec((res) => {
        const rect = res[0]
        if (!rect) return
        const pad = 6
        const spot = {
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }
        const msgHeight = 220
        let msgTop = spot.top - msgHeight - 24
        if (msgTop < 100) msgTop = spot.top + spot.height + 24
        this.setData({ spot, msg: { top: msgTop } })
      })
  },

  onTutorialNext() {
    const next = this.data.tutorialStep + 1
    if (next >= this.data.tutorialSteps.length) {
      this.completeTutorial()
      return
    }
    this.setData({ tutorialStep: next })
    wx.nextTick(() => this.placeSpotlight(next))
  },

  onTutorialSkip() {
    this.completeTutorial()
  },

  completeTutorial() {
    storage.set('hasSeenTutorial', true)
    this.setData({ showTutorial: false })
  },

  noop() {},

  /* ===== Swiper ===== */
  onSwiperChange(e) {
    this.setData({ currentIdx: e.detail.current })
    // 切换句子时打断当前 TTS
    if (this.data.listeningId) this.endListen()
  },

  /* ===== 收藏 ===== */
  onTapFavorite(e) {
    const id = e.currentTarget.dataset.id
    const favs = { ...this.data.favorites }
    favs[id] = !favs[id]
    const pop = { ...this.data.popIds, [id]: true }
    this.setData({ favorites: favs, popIds: pop })
    storage.set('favorites', favs)

    setTimeout(() => {
      const newPop = { ...this.data.popIds }
      delete newPop[id]
      this.setData({ popIds: newPop })
    }, 450)

    // 后端同步（不阻塞 UI）
    callFunction('saveFavorite', {
      sentenceId: id,
      action: favs[id] ? 'add' : 'remove',
    })
  },

  /* ===== 听一遍：TTS + 卡拉 OK ===== */
  onTapListen() {
    const idx = this.data.currentIdx
    const sentence = this.data.sentences[idx]
    if (!sentence) return
    if (this.data.listeningId) return

    this.setData({ listeningId: sentence._id, currentSegIdx: 0 })

    const segDuration = 1100
    sentence.slots.forEach((slot, i) => {
      setTimeout(() => {
        if (this.data.listeningId !== sentence._id) return
        this.setData({ currentSegIdx: i })
      }, i * segDuration)
    })

    // 触发 TTS
    textToSpeech(sentence.body)
      .then((tts) => {
        if (this.data.listeningId !== sentence._id) return
        if (tts && tts.filename) {
          this._ttsCtx = playAudio(tts.filename, {
            onEnded: () => this.endListen(),
            onError: () => this.endListen(),
          })
        } else {
          setTimeout(() => this.endListen(), sentence.slots.length * segDuration + 200)
        }
      })
      .catch(() => {
        setTimeout(() => this.endListen(), sentence.slots.length * segDuration + 200)
      })
  },

  endListen() {
    this.setData({ listeningId: null, currentSegIdx: -1 })
    if (this._ttsCtx) {
      try { this._ttsCtx.destroy() } catch (e) {}
      this._ttsCtx = null
    }
  },

  /* ===== 跳转 ===== */
  onTapStructure(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/structure/structure?id=${id}` })
  },

  onTapRecord() {
    const sentence = this.data.sentences[this.data.currentIdx]
    if (!sentence) return
    wx.navigateTo({ url: `/pages/record/record?id=${sentence._id}` })
  },

  onUnload() {
    if (this._ttsCtx) {
      try { this._ttsCtx.destroy() } catch (e) {}
    }
  },
})
