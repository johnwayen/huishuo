// pages/celebration/celebration.js — 今日完成 · 打卡庆祝
const app = getApp()
const { callFunction } = require('../../utils/cloud')

const CONFETTI_COLORS = ['#FF6B52', '#3F6B3F', '#46578A', '#D4A24C', '#A35424', '#FFA391']

Page({
  data: {
    streak: { count: 7 },
    stats: { done: 3, minutes: 12, avgScore: 85 },
    newFormula: '',
    confettiList: [],
  },

  async onLoad() {
    this.buildConfetti()
    this.loadStats()
  },

  buildConfetti() {
    const list = []
    let s = 17
    for (let i = 0; i < 12; i++) {
      s = (s * 9301 + 49297) % 233280
      const r1 = s / 233280
      s = (s * 9301 + 49297) % 233280
      const r2 = s / 233280
      s = (s * 9301 + 49297) % 233280
      const r3 = s / 233280
      list.push({
        i,
        top: Math.floor(r1 * 55),
        left: Math.floor(r2 * 92),
        bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.floor(r3 * 90 - 45),
      })
    }
    this.setData({ confettiList: list })
  },

  async loadStats() {
    try {
      const res = await callFunction('getMyStats', { period: 'today' })
      if (res.ok && res.data) {
        const d = res.data
        this.setData({
          streak: { count: d.streak || 7 },
          stats: {
            done: d.todayDone || 3,
            minutes: d.todayMinutes || 12,
            avgScore: d.todayAvgScore || 85,
          },
          newFormula: d.newFormulaToday || '',
        })
        app.globalData.streak = { count: d.streak || 7 }
        return
      }
    } catch (err) {}

    // 退化默认值
    const streak = app.globalData.streak || { count: 7 }
    const todaySentences = app.globalData.todaySentences
    const newFormula = todaySentences?.[0]
      ? `${todaySentences[0].skeleton_name} · ${todaySentences[0].scene_category}`
      : ''
    this.setData({ streak, newFormula })
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    return {
      title: `我已经连续 ${this.data.streak.count} 天用会说练表达了！`,
      path: '/pages/index/index',
    }
  },

  onShareTimeline() {
    return {
      title: `每天 10 分钟，我已经连续坚持 ${this.data.streak.count} 天`,
      query: '',
    }
  },
})
