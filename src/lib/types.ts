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
};

export interface ThemePreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
  sub: string; // 次要文字
  ui: string; // 工具栏背景
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "paper", name: "纸白", bg: "#f6f3ec", fg: "#2e2b26", sub: "#8a8478", ui: "#efeade" },
  { id: "sepia", name: "羊皮纸", bg: "#f1e5cb", fg: "#4b3b27", sub: "#97825f", ui: "#e9dab8" },
  { id: "bamboo", name: "竹青", bg: "#e2ecda", fg: "#2f3d2a", sub: "#76896c", ui: "#d6e4c9" },
  { id: "mist", name: "雾蓝", bg: "#e6ebf1", fg: "#2a3442", sub: "#71809a", ui: "#dbe3ec" },
  { id: "rose", name: "樱粉", bg: "#f3e6e4", fg: "#432f2e", sub: "#a08381", ui: "#eedbd7" },
  { id: "night", name: "暗夜", bg: "#17191d", fg: "#b6bac2", sub: "#5f646d", ui: "#1f2227" },
  { id: "ink", name: "墨黑", bg: "#000000", fg: "#8f939a", sub: "#4a4e55", ui: "#101112" },
  { id: "boxmocha", name: "双色盒子", bg: "#252637", fg: "#cdd6f4", sub: "#9399b2", ui: "#1e1e2e" },
  { id: "custom", name: "自定义", bg: "#e8dcc3", fg: "#3a2f22", sub: "#8a7a63", ui: "#e2d4b6" },
];

export const DIALOGUE_COLORS = [
  { id: "#b3541e", name: "赭红" },
  { id: "#2563a8", name: "靛蓝" },
  { id: "#2e8b57", name: "松绿" },
  { id: "#8e44ad", name: "紫藤" },
  { id: "#c2185b", name: "茜色" },
  { id: "#0e7c86", name: "青碧" },
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
