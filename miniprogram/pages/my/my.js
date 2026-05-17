// pages/my/my.js — 我的 Tab
const app = getApp()
const { callFunction } = require('../../utils/cloud')
const { fmtGreetingEmoji } = require('../../utils/format')

const MENU_ITEMS = [
  { key: 'formulas', label: '我学会的公式', icon: 'formula', badge: '' },
  { key: 'favorites', label: '我收藏的句子', icon: 'favorite', badge: '' },
  { key: 'recordings', label: '我的录音', icon: 'mic', badge: '' },
  { key: 'history', label: '学习记录', icon: 'history', badge: '' },
  { key: 'help', label: '帮助与反馈', icon: 'help', badge: '' },
  { key: 'settings', label: '设置', icon: 'settings', badge: '' },
]

// 生成 12 周 × 7 天热力图数据
function genHeatmapCells() {
  const cells = []
  let s = 13
  const totalWeeks = 12
  for (let week = 0; week < totalWeeks; week++) {
    for (let day = 0; day < 7; day++) {
      s = (s * 9301 + 49297) % 233280
      const r = s / 233280
      let lvl
      const recent = week >= totalWeeks - 2
      if (recent) {
        if (r < 0.15) lvl = 0
        else if (r < 0.4) lvl = 1
        else if (r < 0.7) lvl = 2
        else if (r < 0.9) lvl = 3
        else lvl = 4
      } else {
        if (r < 0.55) lvl = 0
        else if (r < 0.75) lvl = 1
        else if (r < 0.9) lvl = 2
        else lvl = 3
      }
      cells.push({ key: `${week}-${day}`, lvl })
    }
  }
  return cells
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    greeting: '下午好 ☕',
    userName: '小棉花妈妈',
    stats: {
      streak: 7,
      total: 23,
      skeletons: 6,
      favorites: 12,
    },
    heatmapCells: [],
    monthLabels: ['', '', ''],
    menuItems: MENU_ITEMS,
  },

  async onLoad() {
    this.computeNavBar()
    this.setData({
      greeting: fmtGreetingEmoji(),
      heatmapCells: genHeatmapCells(),
      monthLabels: this.buildMonthLabels(),
    })
    await this.loadStats()
  },

  onShow() {
    this.setData({ greeting: fmtGreetingEmoji() })
    this.loadStats()
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu ? (menu.top - statusBarHeight) * 2 + menu.height : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  buildMonthLabels() {
    // 取本月、上月、上上月（按当前日期倒推 3 个月）
    const today = new Date()
    const labels = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today)
      d.setMonth(today.getMonth() - i)
      labels.push(`${d.getMonth() + 1} 月`)
    }
    return labels
  },

  async loadStats() {
    try {
      const res = await callFunction('getMyStats', { period: 'overall' })
      if (res.ok && res.data) {
        const d = res.data
        const stats = {
          streak: d.streak || 7,
          total: d.totalDays || 23,
          skeletons: d.skeletons || 6,
          favorites: d.favorites || 12,
        }
        const menuItems = MENU_ITEMS.map((m) => {
          if (m.key === 'formulas') return { ...m, badge: `${stats.skeletons} 个` }
          if (m.key === 'favorites') return { ...m, badge: `${stats.favorites} 句` }
          if (m.key === 'recordings') return { ...m, badge: `${d.recordingsCount || 0} 条` }
          return m
        })
        this.setData({
          stats,
          menuItems,
          userName: d.nickname || this.data.userName,
        })
        app.globalData.streak = { count: stats.streak }
        return
      }
    } catch (err) {}

    // 退化：用默认 + 计算菜单 badge
    const stats = this.data.stats
    const menuItems = MENU_ITEMS.map((m) => {
      if (m.key === 'formulas') return { ...m, badge: `${stats.skeletons} 个` }
      if (m.key === 'favorites') return { ...m, badge: `${stats.favorites} 句` }
      if (m.key === 'recordings') return { ...m, badge: `68 条` }
      return m
    })
    this.setData({ menuItems })
  },

  onTapMenu(e) {
    const key = e.currentTarget.dataset.key
    const map = {
      formulas: '/pages/formulas/formulas',
      favorites: '/pages/favorites/favorites',
      recordings: '/pages/recordings/recordings',
      history: '/pages/history/history',
      help: '/pages/help/help',
      settings: '/pages/settings/settings',
    }
    const url = map[key]
    if (url) wx.navigateTo({ url })
  },
})
