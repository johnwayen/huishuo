// pages/settings/settings.js — 设置 ⑪
Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    // 练习设置
    dailyReminder: true,
    reminderTime: '每天 20:00',
    dailyCount: '3 句',
    voice: '温暖女声',
    // 通用
    cacheSize: '12 MB',
    version: 'v0.1.0',
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

  onBack() {
    wx.navigateBack({ delta: 1 })
  },

  onToggleReminder() {
    this.setData({ dailyReminder: !this.data.dailyReminder })
  },

  // 占位点击：暂不跳转，仅做轻反馈
  onTapItem(e) {
    const key = e.currentTarget.dataset.key
    // 视觉占位，无实际跳转
    if (!key) return
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已退出', icon: 'none' })
        }
      },
    })
  },
})
