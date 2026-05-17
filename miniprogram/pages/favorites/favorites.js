// pages/favorites/favorites.js — 我收藏的句子 ⑧
Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    filters: ['全部', '按公式', '按场景'],
    currentFilter: 0,
    favorites: [
      {
        id: 'fav-1',
        text: '这次方案能这么顺利推下来，真的是因为有你在中间帮忙协调，下次还得继续靠你。',
        pattern: '归因强调型',
        scene: '职场赞美',
        date: '5月14日',
      },
      {
        id: 'fav-2',
        text: '您上次提的那个角度我回去想了好几天，确实打开了思路，这次能调整成这样真的多亏了您。',
        pattern: '具体细节型',
        scene: '感谢',
        date: '5月13日',
      },
      {
        id: 'fav-3',
        text: '你这个版本比上次清晰太多了，特别是开头那段铺垫，看完一眼就知道你想说什么。',
        pattern: '进步对比型',
        scene: '职场赞美',
        date: '5月12日',
      },
      {
        id: 'fav-4',
        text: '我看群里大家都在说你这次方案做得漂亮，我也仔细看了一遍，确实是真功夫。',
        pattern: '第三方背书型',
        scene: '职场赞美',
        date: '5月10日',
      },
      {
        id: 'fav-5',
        text: '上次你随口提的那个细节，我才意识到原来这件事可以这么处理，省了我们不少时间。',
        pattern: '具体细节型',
        scene: '感谢',
        date: '5月8日',
      },
      {
        id: 'fav-6',
        text: '要不是你那天提醒我看一眼数据，这个坑可能就掉进去了，真的谢谢你。',
        pattern: '反事实型',
        scene: '感谢',
        date: '5月6日',
      },
    ],
    favCount: 12,
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
