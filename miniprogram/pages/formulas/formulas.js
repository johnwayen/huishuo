// pages/formulas/formulas.js — 我学会的公式 ⑦

const ALL_FORMULAS = [
  {
    id: 'attribution_emphasis',
    name: '归因强调型',
    speech_act: '赞美',
    slots: ['肯定成果', '归因对方', '表达依赖'],
    practiced: 12,
    progress: 80,
  },
  {
    id: 'concrete_detail',
    name: '具体细节型',
    speech_act: '感谢',
    slots: ['具体细节', '内化感悟', '真诚归功'],
    practiced: 10,
    progress: 65,
  },
  {
    id: 'concrete_observation',
    name: '具体观察型',
    speech_act: '赞美',
    slots: ['具体细节', '价值定性', '情感表达'],
    practiced: 8,
    progress: 55,
  },
  {
    id: 'progress_contrast',
    name: '进步对比型',
    speech_act: '赞美',
    slots: ['进步对比', '具体亮点', '价值定性'],
    practiced: 6,
    progress: 40,
  },
  {
    id: 'long_term_impact',
    name: '长期影响型',
    speech_act: '感谢',
    slots: ['具体细节', '长期影响', '真诚归功'],
    practiced: 4,
    progress: 25,
  },
  {
    id: 'counterfactual',
    name: '反事实型',
    speech_act: '赞美',
    slots: ['反事实假设', '凸显贡献'],
    practiced: 2,
    progress: 15,
  },
]

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '赞美', label: '职场赞美' },
  { key: '感谢', label: '感谢' },
]

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    filters: FILTERS,
    activeFilter: 'all',
    totalCount: ALL_FORMULAS.length,
    formulas: ALL_FORMULAS,
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
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeFilter) return
    const formulas =
      key === 'all'
        ? ALL_FORMULAS
        : ALL_FORMULAS.filter((f) => f.speech_act === key)
    this.setData({ activeFilter: key, formulas })
  },

  onTapCard(e) {
    // 预留：点击进入公式详情
    const id = e.currentTarget.dataset.id
    console.log('tap formula card', id)
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
