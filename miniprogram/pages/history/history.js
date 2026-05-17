// pages/history/history.js — 学习记录 ⑩
Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    filters: ['本周', '本月', '全部'],
    currentFilter: 0,
    timeline: [
      {
        date: '5月16日',
        dayLabel: '今天',
        summary: '完成 3 句练习，掌握了一个新公式',
        missed: false,
        stats: { sentences: 3, minutes: 12, avg: 85 },
      },
      {
        date: '5月15日',
        dayLabel: '昨天',
        summary: '完成 3 句练习',
        missed: false,
        stats: { sentences: 3, minutes: 8, avg: 82 },
      },
      {
        date: '5月14日',
        dayLabel: '',
        summary: '完成 3 句练习',
        missed: false,
        stats: { sentences: 3, minutes: 10, avg: 78 },
      },
      {
        date: '5月13日',
        dayLabel: '',
        summary: '没有练习 · 火苗扣 1 颗（被补救卡保住）',
        missed: true,
        stats: null,
      },
      {
        date: '5月12日',
        dayLabel: '',
        summary: '完成 3 句练习',
        missed: false,
        stats: { sentences: 3, minutes: 9, avg: 76 },
      },
      {
        date: '5月11日',
        dayLabel: '',
        summary: '完成 3 句练习',
        missed: false,
        stats: { sentences: 3, minutes: 11, avg: 80 },
      },
    ],
  },

  onLoad() {
    this.computeNavBar()
  },

  computeNavBar() {
    const sys = wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = sys.statusBarHeight || 20
    const navBarHeight = menu ? (menu.top - statusBarHeight) * 2 + menu.height : 44
    this.setData({ statusBarHeight, navBarHeight })
  },

  onTapFilter(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ currentFilter: idx })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
