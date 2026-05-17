// app.js
const CLOUD_ENV_ID = 'cloud1-d8gbg0xlnc596a4e3'

App({
  globalData: {
    env: CLOUD_ENV_ID,
    userInfo: null,
    streak: { count: 0, lastDate: null },
    todaySentences: null, // 今日 3 句缓存
    todayProgress: { done: 0, total: 3 },
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true,
    })
    console.log('[会说] 云开发初始化完成 ·', this.globalData.env)

    // 触发登录（拿 openid + 用户基础信息）
    this.ensureUserSession()
  },

  // 触发登录 + 同步用户记录
  async ensureUserSession() {
    try {
      const res = await wx.cloud.callFunction({ name: 'userLogin' })
      const data = res.result || {}
      if (data.ok) {
        this.globalData.userInfo = data.user
        this.globalData.streak = data.streak || this.globalData.streak
      }
    } catch (err) {
      console.warn('[会说] 登录失败，稍后重试', err)
    }
  },
})
