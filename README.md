# 墨阅 MREAD — 沉浸式小说阅读器

支持 Markdown / TXT 导入、高度自定义排版、对话着色、PWA 离线阅读。

## 技术栈

**Next.js 16** · **React 19** · **Drizzle ORM** · **PostgreSQL** · **Tailwind CSS 4**

## 功能

- 📚 书架管理：导入 .md / .txt，自动解析章节，按色相生成封面
- 📖 阅读器：滚动 / 分页模式，9 套配色主题，自定义字体上传
- 🎨 对话高亮：识别 ""「」『』五种引号，支持多彩轮换
- ⚙️ 高度排版定制：字号/行高/字距/段距/边距/首行缩进/亮度
- 📱 PWA 离线：添加到主屏幕即可独立运行
- 📌 书签 + 阅读进度自动保存
- 🎴 内置示例书《夜航星》

## 快速部署

### 一键部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/wenjianmin24-pixel/mread)

或手动部署：

1. 在 Render 创建 **PostgreSQL**（Free 套餐）
2. 创建 **Web Service** 连此仓库：
   - Build: `npm install && npx next build`
   - Start: `npx next start`
   - 环境变量：`DATABASE_URL` = PostgreSQL 连接串
3. 部署后在 Shell 执行：`npx drizzle-kit push`

## 本地开发

```bash
# 安装依赖
npm install

# 准备数据库（需要本地 PostgreSQL）
cp .env.example .env
# 编辑 .env 填入 DATABASE_URL

# 建表
npx drizzle-kit push

# 启动
npm run dev
```

## License

MIT