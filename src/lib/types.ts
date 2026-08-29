/** 阅读器个性化设置（存于 settings 表 JSON） */
export interface ReaderSettings {
  fontFamily: string; // system | serif | sans | rounded | custom:<fontId>
  fontSize: number; // px
  lineHeight: number; // 倍数
  letterSpacing: number; // px
  paragraphSpacing: number; // em
  sidePadding: number; // px 页面左右边距
  theme: string; // 主题 id
  customBg: string;
  customFg: string;
  dialogueEnabled: boolean; // 对话高亮开关
  dialogueColor: string; // 对话颜色
  dialogueBold: boolean; // 对话加粗
  dialogueRainbow: boolean; // 多彩对话（逐段轮换）
  firstLineIndent: boolean; // 首行缩进
  pageMode: "scroll" | "paged"; // 滚动 / 横向翻页
  brightness: number; // 0.3 ~ 1
  keepAwake: boolean; // 屏幕常亮
  showFooter: boolean; // 底部进度显示
  coverTitleSize: number; // 书架封面书名字号 px
  autoScrollSpeed: number; // 自动滚屏速度 px/s
  contentWidth: number; // 页宽 70~100 (%)
  followSystem: boolean; // 跟随系统深浅色
  dayTheme: string; // 日间主题 id
  nightTheme: string; // 夜间主题 id
  moodStyling: boolean; // 氛围渲染（气声/独白/拟声自动识别）
  spiceStyle: "subtle" | "honey" | "silk" | "blaze"; // 风味包
  spiceIntensity: number; // 效果强度 0~100
  spicePulse: boolean; // 实验性：呼吸动效
  aiConfig: AIConfig; // AI 优化配置
}

/** AI 优化配置 */
export interface AIConfig {
  apiUrl: string; // OpenAI 兼容 API 地址
  apiKey: string;
  model: string;
  prompt: string; // 系统提示词：三级标记强化
  cleanupPrompt: string; // 系统提示词：去除 AI 八股
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: 1.9,
  letterSpacing: 0,
  paragraphSpacing: 1.0,
  sidePadding: 22,
  theme: "paper",
  customBg: "#e8dcc3",
  customFg: "#3a2f22",
  dialogueEnabled: true,
  dialogueColor: "#b3541e",
  dialogueBold: false,
  dialogueRainbow: false,
  firstLineIndent: true,
  pageMode: "scroll",
  brightness: 1,
  keepAwake: false,
  showFooter: true,
  coverTitleSize: 15,
  autoScrollSpeed: 60,
  contentWidth: 100,
  followSystem: false,
  dayTheme: "paper",
  nightTheme: "night",
  moodStyling: true,
  spiceStyle: "honey",
  spiceIntensity: 70,
  spicePulse: false,
  aiConfig: {
    apiUrl: "",
    apiKey: "",
    model: "",
    prompt: `你是小说文本格式标注器。对给定正文进行三级标记强化，严格不改动任何正文文字，只添加标记符号。

**锚点**（加粗）：材质+颜色+部位组合词，如「翠绿色头发」「洁白羽翼」「蓝色丝质面罩」「金色玫瑰花」。每段不超过 4 处。
==燃点==（高亮）：最具感官冲击力的词句、关键动作、敏感部位描写。仅用于最强烈的句子，控制用量。
*呢喃*（斜体）：叙述者的感受、评价、心理活动整句，如「看起来非常舒适柔软」「令人遗憾的是」。

着色说明：阅读器会自动识别锚点与燃点短语中的颜色词（翠绿/绿/金/橙/蓝/白/粉/红/紫/黑/灰/青/棕/银），并将该短语渲染成对应颜色。因此锚点务必保留完整的颜色词，让显示效果与描写内容一致；不含颜色词的短语会使用默认色，不要为此额外造词。

规则：
- 保持段落结构不变，不拆段不合并
- 不改正文任何一个字，只添加标记
- 直接输出纯 Markdown，不要解释，不要用代码块包裹`,
    cleanupPrompt: `你是小说文本编辑器，任务是去除正文中的"AI 八股"腔调，让文字像人写的。只做最小限度的必要改写，不重写、不扩写、不删减情节。

一、限制"先否后肯"类句式（主要针对叙事旁白和心理描写；角色对白中确实在纠正对方误解或澄清自己立场时不受此限）

核心判断标准：
- 有信息量的否定：被否定的 A 确实是对方或读者可能产生的误解，否定它能防止理解偏差——保留
- 无信息量的否定：被否定的 A 是作者自己立的靶子，读者根本没往那个方向想，否定它只是为了让 B 显得更深刻——删掉 A，直接写 B

叙事旁白中的禁用句式（当 A 是凭空自造的靶子时）：
- "不是A，而是B"
- "并非A，而是B"
- "与其说A，不如说B"
- "看似A，实则B"
- "表面上A，骨子里B"
- "说是A，更像是B"
- "算不上A，更接近B"
- "谈不上A，只是B"
- "没有A，就只是B"
- "没有任何X，直接/径直Y"（当否定环节是废话时）

允许保留的用法：
- 角色对白中纠正误解："我没生气，就是累了。"
- 角色对白中澄清立场："这不是建议，你必须去。"
- 叙事中拦截合理误读：上文已经铺垫了某种印象，叙述者需要及时纠正读者的惯性判断
- 信息对比有实际内容：A 和 B 指向两个具体的、不同的事实，读者确实需要知道区别

替代策略（适用于被禁的情况）：
- 直接陈述 B，删掉 A
- 用具体行为和细节让读者自己判断
- 需要递进时用因果句或条件句

对照示例：
- 禁止："他的沉默不是冷漠，而是在消化刚才的话。" 改为："他没接话，隔了一会儿才把那句话在脑子里过完。"
- 禁止："看似平静，实则内心早已翻涌。" 改为："他站着没动，手插在兜里，拇指一直在搓裤缝。"
- 允许："我没在怪你，真的，就是有点累。"（角色在纠正对方的误解，是活人会说的话）
- 允许："这不是商量，你今天必须回去。"（角色在强调态度，否定环节承载了立场信息）
- 需判断：上文写了角色笑着答应帮忙——"答应得痛快，手却没从口袋里拿出来。"（允许，用行为细节让读者自己察觉矛盾）；"他答应了，但这并非出于好意，而是另有打算。"（禁止，作者跳出来解释）

自查方法：写完一句"先否后肯"的句子后，删掉否定 A 的部分只留 B——意思完整、读者不会误解就删掉 A；删掉后读者确实会往错误方向理解就保留。

二、正文中除语气拖长外，禁止使用破折号"——"；叙事旁白和心理描写里的破折号改写为句号、逗号或直接衔接（角色对白中表示说话中断、拖长的破折号可保留）

输出规则：
- 保持段落结构与分段不变，不拆段不合并
- 只输出净化后的正文，不添加任何标记符号（不加 ** == *）
- 直接输出纯 Markdown，不要解释，不要用代码块包裹`,
  },
};

export interface ThemePreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
  sub: string; // 次要文字
  ui: string; // 工具栏背景
  dark: boolean; // 暗色主题（面板分组用）
}

export const THEME_PRESETS: ThemePreset[] = [
  // ===== 亮色 =====
  { id: "paper", name: "纸白", bg: "#f6f3ec", fg: "#2e2b26", sub: "#8a8478", ui: "#efeade", dark: false },
  { id: "sepia", name: "羊皮纸", bg: "#f1e5cb", fg: "#4b3b27", sub: "#97825f", ui: "#e9dab8", dark: false },
  { id: "bamboo", name: "竹青", bg: "#e2ecda", fg: "#2f3d2a", sub: "#76896c", ui: "#d6e4c9", dark: false },
  { id: "mist", name: "雾蓝", bg: "#e6ebf1", fg: "#2a3442", sub: "#71809a", ui: "#dbe3ec", dark: false },
  { id: "rose", name: "樱粉", bg: "#f3e6e4", fg: "#432f2e", sub: "#a08381", ui: "#eedbd7", dark: false },
  { id: "celadon", name: "青瓷", bg: "#e8f0ea", fg: "#2b4036", sub: "#7f9c8d", ui: "#dcebe1", dark: false },
  { id: "sky", name: "晴空", bg: "#eaf3fa", fg: "#2c3e54", sub: "#83a0b8", ui: "#ddeaf4", dark: false },
  { id: "almond", name: "杏仁", bg: "#f7ecdc", fg: "#453527", sub: "#ab9174", ui: "#f0e1ca", dark: false },
  { id: "lavender", name: "薰衣草", bg: "#efebf7", fg: "#372f4c", sub: "#8e84ab", ui: "#e5dff1", dark: false },
  { id: "mint", name: "薄荷", bg: "#e2f2ec", fg: "#1f453c", sub: "#72a497", ui: "#d4eae1", dark: false },
  // ===== 暗色 =====
  { id: "night", name: "暗夜", bg: "#17191d", fg: "#b6bac2", sub: "#5f646d", ui: "#1f2227", dark: true },
  { id: "ink", name: "墨黑", bg: "#000000", fg: "#8f939a", sub: "#4a4e55", ui: "#101112", dark: true },
  { id: "boxmocha", name: "双色盒子", bg: "#252637", fg: "#cdd6f4", sub: "#9399b2", ui: "#1e1e2e", dark: true },
  { id: "deepsea", name: "深海", bg: "#0b1523", fg: "#a9bcd4", sub: "#58708c", ui: "#122033", dark: true },
  { id: "forest", name: "墨绿", bg: "#0e1e16", fg: "#a6c2b2", sub: "#567466", ui: "#152820", dark: true },
  { id: "blackgold", name: "黑金", bg: "#131313", fg: "#d8c489", sub: "#7d7156", ui: "#1c1b18", dark: true },
  { id: "violet", name: "紫夜", bg: "#1a1526", fg: "#c2b7de", sub: "#6c6290", ui: "#231d33", dark: true },
  { id: "nord", name: "极夜", bg: "#2e3440", fg: "#d8dee9", sub: "#4f5b6c", ui: "#3b4252", dark: true },
  { id: "gruvbox", name: "暖石", bg: "#282828", fg: "#ebdbb2", sub: "#928374", ui: "#32302f", dark: true },
  { id: "rosepine", name: "暮玫", bg: "#191724", fg: "#e0def4", sub: "#6e6a86", ui: "#1f1d2e", dark: true },
  // ===== 自定义 =====
  { id: "custom", name: "自定义", bg: "#e8dcc3", fg: "#3a2f22", sub: "#8a7a63", ui: "#e2d4b6", dark: false },
];

export const DIALOGUE_COLORS = [
  { id: "#b3541e", name: "赭红" },
  { id: "#2563a8", name: "靛蓝" },
  { id: "#2e8b57", name: "松绿" },
  { id: "#8e44ad", name: "紫藤" },
  { id: "#c2185b", name: "茜色" },
  { id: "#0e7c86", name: "青碧" },
];

/** 风味包预设（三级标记效果） */
export const SPICE_PRESETS: {
  id: ReaderSettings["spiceStyle"];
  name: string;
  desc: string;
}[] = [
  { id: "subtle", name: "含蓄", desc: "仅变色，无光效，混入书架无违和" },
  { id: "honey", name: "蜜色", desc: "锚点蜜色光晕 · 燃点潮红 · 呢喃气音" },
  { id: "silk", name: "流光", desc: "锚点丝绸流光 · 燃点潮红 · 呢喃气音" },
  { id: "blaze", name: "燃情", desc: "蜜色 + 呼吸律动，动静最大" },
];

/** 多彩对话轮换色板（对应 CSS 类 dlg-c0 ~ dlg-c5） */
export const RAINBOW_COLORS = [
  "#b3541e",
  "#2563a8",
  "#2e8b57",
  "#8e44ad",
  "#c2185b",
  "#0e7c86",
];

/** 双色盒子 · Catppuccin Mocha 多彩对话色板 */
export const BOXMOCHA_RAINBOW = [
  "#a6e3a1", // 抹茶绿
  "#cba6f7", // 香芋紫
  "#89b4fa", // 蓝
  "#fab387", // 蜜桃
  "#f38ba8", // 红
  "#94e2d5", // 青
];

export const FONT_STACKS: Record<string, string> = {
  system: `-apple-system, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
  serif: `"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif`,
  sans: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
  rounded: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Noto Sans SC", sans-serif`,
};

export interface BookMeta {
  id: number;
  title: string;
  author: string;
  format: string;
  coverHue: number;
  wordCount: number;
  chapterCount: number;
  createdAt: string;
  lastReadAt: string | null;
  progressChapterId?: number | null;
  progressRatio?: number | null;
}

export interface ChapterMeta {
  id: number;
  title: string;
  orderIndex: number;
  wordCount: number;
}
