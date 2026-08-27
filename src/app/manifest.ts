import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "墨阅 · Markdown 小说阅读器",
    short_name: "墨阅",
    description: "支持 Markdown / TXT 导入、高度自定义排版与对话着色的沉浸式小说阅读器",
    start_url: "/",
    display: "standalone",
    background_color: "#101013",
    theme_color: "#101013",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
