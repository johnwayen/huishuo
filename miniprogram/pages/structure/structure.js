// pages/structure/structure.js — 骨架解析
const app = getApp()
const { getSentenceById, getSkeletonById, getSlotAlternatives, SEED_SENTENCES } = require('../../data/seed')
const { callFunction } = require('../../utils/cloud')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: ['结构骨架', '适用场景', '怎么读'],
    currentTab: 0,
    sentence: null,
    skeleton: null,
    slotAlts: [], // 二维数组：每个 slot 的替换示例
    prosody: {
      mood: '真诚 · 温暖',
      stresses: [],
      pauses: [],
      tempo: '',
    },
  },

  async onLoad(query) {
    this.computeNavBar()
    const id = query.id
    await this.loadData(id)
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu ? (menu.top - statusBarHeight) * 2 + menu.height : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  async loadData(id) {
    // 先看本地 seed，再用云函数补充（如果有的话）
    let sentence = getSentenceById(id)
    let skeleton = sentence ? getSkeletonById(sentence.skeleton_id) : null

    // 计算 sentence 在 today 列表中的位置
    const list = app.globalData.todaySentences || SEED_SENTENCES
    const index = list.findIndex((s) => s._id === id)
    if (sentence) {
      sentence.index = index >= 0 ? index : 0
      sentence.total = list.length || 3
    }

    // slot alternatives
    const slotAlts = sentence
      ? sentence.slots.map((slot) => {
          // 过滤掉当前句的原文，避免重复
          return getSlotAlternatives(slot.type).filter((alt) => alt !== slot.text).slice(0, 3)
        })
      : []

    // prosody 数据
    const prosody = this.buildProsody(sentence)

    this.setData({ sentence, skeleton, slotAlts, prosody })
  },

  /** 从 sentence.slots.prosody 抽出 stress / pause / tempo */
  buildProsody(sentence) {
    if (!sentence) return { mood: '真诚 · 温暖', stresses: [], pauses: [], tempo: '' }

    const stresses = []
    const pauses = []
    const moodSet = new Set()
    const tempoParts = []

    sentence.slots.forEach((slot, idx) => {
      const p = slot.prosody || {}
      if (Array.isArray(p.stress)) {
        // 把单字重音合并成词级展示，简单 join 相邻字
        const chars = p.stress
        if (chars.length === 1) stresses.push(chars[0])
        else stresses.push(chars.join(''))
      }
      if (p.pauseAfter) {
        const lastChars = (slot.text || '').slice(-2)
        pauses.push(`"${lastChars}"后短停 ${p.pauseAfter}ms`)
      }
      if (p.emotion) moodSet.add(p.emotion)
      if (p.tempo) {
        const seg = idx === 0 ? '第一段' : idx === 1 ? '第二段' : '第三段'
        tempoParts.push(`${seg} ${p.tempo}`)
      }
    })

    const mood = Array.from(moodSet).slice(0, 2).join(' · ') || '真诚 · 温暖'
    const tempo = tempoParts.join('，') + (tempoParts.length ? '，结尾语调微微上扬。' : '')

    return { mood, stresses, pauses, tempo }
  },

  onTapTab(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ currentTab: idx })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
