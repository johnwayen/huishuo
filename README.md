# 会说 · 让每句话都说到点上

> 面向职场新人（22-28 岁）的表达力训练微信小程序。
> 每天 10 分钟，从敢说到会说。

## 项目结构

```
huishuo/
├── miniprogram/          # 小程序客户端
│   ├── pages/            # 12 屏页面
│   ├── components/       # 公共组件
│   ├── utils/            # 工具方法
│   ├── styles/           # 公共样式 + 设计 token
│   ├── assets/           # 图片 / 字体
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── cloudfunctions/       # 云函数（云开发后端）
│   ├── analyzeAudio/     # AI 评分主链路
│   ├── getDailySentences/
│   ├── updateStreak/
│   ├── getMyStats/
│   └── ...
├── content/              # 内容数据
│   ├── skeletons/        # 8 个骨架定义
│   ├── slot_types/       # 18 个 slot 类型词汇表
│   └── sentences/        # 200 句首发语料
├── scripts/              # 部署 / 数据导入脚本
└── docs/                 # 项目内文档
```

完整产品文档：`~/Documents/Obsidian Vault/产品库/会说/`

## 技术栈

- **端**：微信小程序原生
- **后端**：微信云开发（云函数 + CloudDB + 云存储）
- **ASR / TTS**：微信同声传译插件
- **LLM**：DeepSeek-V3

## 开发流程

1. 复制 `.env.example` 为 `.env`，填入实际密钥
2. 用微信开发者工具打开本项目
3. 修改 `miniprogram/app.js` 里的环境 ID（已硬编码）
4. 一键编译

## 部署

云函数部署（需先 `tcb login`）：
```bash
sh scripts/deploy-functions.sh
```

CloudDB 集合初始化：
```bash
node scripts/init-collections.js
```

数据导入（骨架 + slot + 句子）：
```bash
node scripts/seed-content.js
```

## 分支策略

- `main` — 生产
- `dev` — 开发主分支
- `feature/*` — 单功能开发

## 文档导览

| 文档 | 角色 |
|---|---|
| 产品文档.md | 产品定位 |
| 三层方法论.md | 内容 schema 根基 |
| MVP规划.md | 范围 / 工作清单 |
| 内容标注规范.md | 内容生产手册 |
| 技术栈.md | 选型决策 |
| 技术实现要点.md | 工程实施细节 |

## License

Private © 2026 上海墨黎信息科技有限公司
