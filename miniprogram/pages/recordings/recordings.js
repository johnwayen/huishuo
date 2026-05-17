// pages/recordings/recordings.js — 我的录音 ⑨
Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalCount: 68,
    filters: ['全部', '高分 (≥80)', '待提升'],
    currentFilter: 0,
    recordings: {
      today: [
        { id: 't1', text: '"这次方案能这么顺利推下来..."', time: '10:23', duration: '6 秒', score: 82 },
        { id: 't2', text: '"您上次提的那个角度我回去想了好几天..."', time: '10:18', duration: '8 秒', score: 85 },
        { id: 't3', text: '"你这个版本比上次清晰太多了..."', time: '10:11', duration: '5 秒', score: 72 },
      ],
      yesterday: [
        { id: 'y1', text: '"全靠你那次在群里帮忙打通..."', time: '21:42', duration: '7 秒', score: 88 },
        { id: 'y2', text: '"上次你随口提的那个细节，我才意识到..."', time: '21:35', duration: '9 秒', score: 76 },
      ],
    },
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

  onTapPlay() {
    wx.showToast({ title: '播放功能待接入', icon: 'none' })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
