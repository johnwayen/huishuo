// pages/help/help.js — 帮助与反馈 ⑩

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    faqs: [
      {
        q: '怎么提高 AI 评分？',
        a: '先听一遍 AI 标准版，注意句子上面的红点（重音）和 ｜（停顿）位置。然后跟着读，重点把红点位置的字读得稍重，｜ 位置稍微停一下。多练几次，分数会慢慢上来。',
        open: true,
      },
      {
        q: '录音失败怎么办？',
        a: '检查是否开启了麦克风权限，进入 设置 → 麦克风 → 允许 会说 使用。',
        open: false,
      },
      {
        q: '每天一定要练 3 句吗？',
        a: '不强制。3 句是建议量，让你能完整体验骨架学习。少于 3 句也算坚持。',
        open: false,
      },
      {
        q: '录音会被上传吗？安全吗？',
        a: '录音上传到我们的私有云存储，仅用于 AI 评分。30 天后自动清理，绝不外传。',
        open: false,
      },
      {
        q: '怎么联系客服？',
        a: '页面下方反馈表单或加客服微信 huishuo_help。',
        open: false,
      },
    ],
    feedbackText: '',
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

  onToggleFaq(e) {
    const idx = e.currentTarget.dataset.idx
    const key = `faqs[${idx}].open`
    this.setData({ [key]: !this.data.faqs[idx].open })
  },

  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value })
  },

  onSubmit() {
    wx.showToast({
      title: '感谢反馈，我们会认真看 ✨',
      icon: 'none',
      duration: 2000,
    })
    this.setData({ feedbackText: '' })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
