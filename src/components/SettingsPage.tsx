"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileUp,
  Loader2,
  RotateCcw,
  Trash2,
  Type,
  Quote,
  Palette,
  MousePointerClick,
  Info,
  LibraryBig,
  Wand2,
  PlugZap,
  ListRestart,
} from "lucide-react";
import { DEFAULT_SETTINGS, FONT_STACKS, type AIConfig, type ReaderSettings } from "@/lib/types";

interface FontMeta {
  id: number;
  name: string;
  fileName: string;
  mime: string;
}

export default function SettingsPage({ initialFonts }: { initialFonts: FontMeta[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fontList, setFontList] = useState(initialFonts);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  // 书架设置（封面字号）
  const [shelfSettings, setShelfSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [shelfLoaded, setShelfLoaded] = useState(false);
  const saveShelfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings)
          setShelfSettings({
            ...DEFAULT_SETTINGS,
            ...d.settings,
            aiConfig: { ...DEFAULT_SETTINGS.aiConfig, ...d.settings.aiConfig },
          });
      })
      .finally(() => setShelfLoaded(true));
  }, []);

  function setCoverTitleSize(v: number) {
    const next = { ...shelfSettings, coverTitleSize: v };
    setShelfSettings(next);
    if (saveShelfTimer.current) clearTimeout(saveShelfTimer.current);
    saveShelfTimer.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 500);
  }

  function setAIField<K extends keyof AIConfig>(key: K, value: AIConfig[K]) {
    const next = { ...shelfSettings, aiConfig: { ...shelfSettings.aiConfig, [key]: value } };
    setShelfSettings(next);
    if (saveShelfTimer.current) clearTimeout(saveShelfTimer.current);
    saveShelfTimer.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 800);
  }

  function resetAIPrompt() {
    setAIField("prompt", DEFAULT_SETTINGS.aiConfig.prompt);
    showToast("已恢复默认提示词");
  }

  function resetAICleanupPrompt() {
    setAIField("cleanupPrompt", DEFAULT_SETTINGS.aiConfig.cleanupPrompt);
    showToast("已恢复默认净化提示词");
  }

  // AI 连通性测试 / 模型列表拉取
  const [aiBusy, setAiBusy] = useState<"test" | "models" | null>(null);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [modelList, setModelList] = useState<string[]>([]);

  async function testAI() {
    setAiBusy("test");
    setAiMsg(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: shelfSettings.aiConfig.apiUrl,
          apiKey: shelfSettings.aiConfig.apiKey,
          model: shelfSettings.aiConfig.model,
        }),
      });
      const d = await res.json();
      setAiMsg(
        d.ok
          ? { ok: true, text: `连接正常 · ${d.latencyMs}ms · 模型回复：${d.reply || "（空）"}` }
          : { ok: false, text: d.error || "测试失败" }
      );
    } catch {
      setAiMsg({ ok: false, text: "测试请求异常" });
    } finally {
      setAiBusy(null);
    }
  }

  async function fetchModels() {
    setAiBusy("models");
    setAiMsg(null);
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: shelfSettings.aiConfig.apiUrl,
          apiKey: shelfSettings.aiConfig.apiKey,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setModelList(d.models);
        setAiMsg({
          ok: true,
          text: d.models.length
            ? `拉取到 ${d.models.length} 个模型，点击「模型名」输入框可直接选择`
            : "该 API 未返回任何模型",
        });
      } else {
        setAiMsg({ ok: false, text: d.error || "拉取失败" });
      }
    } catch {
      setAiMsg({ ok: false, text: "拉取请求异常" });
    } finally {
      setAiBusy(null);
    }
  }

  // 封面书名跟随正文字体
  const titleFont = shelfSettings.fontFamily.startsWith("custom:")
    ? `"custom-font-${shelfSettings.fontFamily.split(":")[1]}"`
    : FONT_STACKS[shelfSettings.fontFamily] ?? FONT_STACKS.serif;

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  // 为每个已上传字体注入 @font-face 以便预览
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = fontList
      .map(
        (f) =>
          `@font-face{font-family:"custom-font-${f.id}";src:url("/api/fonts/${f.id}/file") format("${
            f.mime.includes("woff2") ? "woff2" : f.mime.includes("woff") ? "woff" : "truetype"
          }");font-display:swap;}`
      )
      .join("\n");
    document.head.appendChild(style);
    return () => style.remove();
  }, [fontList]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/fonts", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "上传失败");
          continue;
        }
        setFontList((fs) => [data.font, ...fs]);
        showToast(`字体「${data.font.name}」已导入`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: number) {
    await fetch(`/api/fonts/${id}`, { method: "DELETE" });
    setFontList((fs) => fs.filter((f) => f.id !== id));
    showToast("已删除字体");
  }

  async function resetSettings() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEFAULT_SETTINGS),
    });
    showToast("已恢复默认阅读设置");
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 pb-20 pt-6">
      {/* 顶栏 */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition active:scale-90"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-serif text-xl font-bold text-zinc-100">设置与字体</h1>
      </header>

      {/* 字体管理 */}
      <section className="anim-fade-up mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
            <Type size={15} className="text-amber-400" />
            我的字体
          </h2>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-semibold text-black transition active:scale-95"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
            导入字体
          </button>
        </div>
        <p className="mt-1.5 text-xs text-zinc-600">
          支持 .ttf / .otf / .woff / .woff2，导入后可在阅读器「字体」设置中选用
        </p>

        <div className="mt-4 space-y-2.5">
          {fontList.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-xs text-zinc-600">
              还没有导入字体 —— 试试导入一款喜欢的中文宋体或楷体
            </div>
          )}
          {fontList.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3.5"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 text-xl text-amber-200"
                style={{ fontFamily: `"custom-font-${f.id}"` }}
              >
                永
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{f.name}</p>
                <p className="truncate text-[11px] text-zinc-600">{f.fileName}</p>
                <p
                  className="mt-0.5 truncate text-[13px] text-zinc-400"
                  style={{ fontFamily: `"custom-font-${f.id}"` }}
                >
                  书山有路勤为径，学海无涯苦作舟
                </p>
              </div>
              <button
                onClick={() => remove(f.id)}
                className="rounded-full p-2 text-zinc-600 transition hover:text-red-400 active:scale-90"
                aria-label="删除字体"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 书架设置 */}
      <section className="anim-fade-up mt-10" style={{ animationDelay: "0.05s" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
          <LibraryBig size={15} className="text-amber-400" />
          书架设置
        </h2>
        <div className="mt-3 flex items-center gap-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          {/* 预览封面 */}
          <div className="w-20 shrink-0">
            <div
              className="flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl p-2.5 shadow-lg"
              style={{
                background:
                  "linear-gradient(160deg, hsl(216 32% 30%) 0%, hsl(216 40% 16%) 60%, hsl(240 42% 11%) 100%)",
              }}
            >
              <span className="self-start rounded bg-white/12 px-1 py-0.5 text-[8px] tracking-wider text-white/80">
                MD
              </span>
              <div>
                <p
                  className="font-bold leading-snug text-white/95"
                  style={{
                    fontSize: shelfSettings.coverTitleSize,
                    fontFamily: titleFont,
                    display: "-webkit-box",
                    WebkitLineClamp: shelfSettings.coverTitleSize >= 18 ? 2 : 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  夜航星与漂流的书信
                </p>
                <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
                </div>
              </div>
            </div>
          </div>
          {/* 滑块 */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">封面书名字号</span>
              <span className="tabular-nums text-zinc-500">{shelfSettings.coverTitleSize}px</span>
            </div>
            <input
              type="range"
              min={11}
              max={22}
              step={1}
              value={shelfSettings.coverTitleSize}
              onChange={(e) => setCoverTitleSize(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
              disabled={!shelfLoaded}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
              调整书架上封面书名的显示大小，大字号自动减少行数。保存后返回书架生效。
            </p>
          </div>
        </div>
      </section>

      {/* 阅读偏好说明 */}
      <section className="anim-fade-up mt-10" style={{ animationDelay: "0.1s" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
          <Palette size={15} className="text-amber-400" />
          个性化能力
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {[
            { icon: Type, t: "字体字号", d: "4 款内置字族 + 自定义导入字体" },
            { icon: Quote, t: "对话着色", d: "自动识别引号对白，支持多彩轮换" },
            { icon: Palette, t: "主题配色", d: "20 款预设主题 + 自定义背景/文字色" },
            { icon: MousePointerClick, t: "翻页方式", d: "沉浸滚动 / 横向仿真分页" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
              <c.icon size={16} className="text-amber-400/80" />
              <p className="mt-2 text-[13px] font-medium text-zinc-200">{c.t}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI 优化配置 */}
      <section className="anim-fade-up mt-10" style={{ animationDelay: "0.2s" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
          <Wand2 size={15} className="text-amber-400" />
          AI 优化配置
        </h2>
        <p className="mt-1.5 text-xs text-zinc-600">
          接入 OpenAI 兼容 API：按提示词给章节加三级标记（锚点/燃点/呢喃），或按净化提示词去除正文中的 AI 八股腔
        </p>

        <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">API 地址</span>
            <input
              value={shelfSettings.aiConfig.apiUrl}
              onChange={(e) => setAIField("apiUrl", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">API Key</span>
            <input
              type="password"
              value={shelfSettings.aiConfig.apiKey}
              onChange={(e) => setAIField("apiKey", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
              placeholder="sk-..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">模型名</span>
            <input
              value={shelfSettings.aiConfig.model}
              onChange={(e) => setAIField("model", e.target.value)}
              list="ai-model-list"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
              placeholder="gpt-4o-mini / deepseek-chat / ..."
            />
            <datalist id="ai-model-list">
              {modelList.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <div className="flex gap-2">
            <button
              onClick={testAI}
              disabled={aiBusy != null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              {aiBusy === "test" ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} className="text-amber-400" />}
              测试连接
            </button>
            <button
              onClick={fetchModels}
              disabled={aiBusy != null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              {aiBusy === "models" ? <Loader2 size={13} className="animate-spin" /> : <ListRestart size={13} className="text-amber-400" />}
              拉取模型列表
            </button>
          </div>
          {aiMsg && (
            <p className={`break-all text-[11px] leading-relaxed ${aiMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
              {aiMsg.text}
            </p>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">强化提示词（三级标记）</span>
              <button
                onClick={resetAIPrompt}
                className="text-[10px] text-amber-400/70 transition active:scale-95"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={shelfSettings.aiConfig.prompt}
              onChange={(e) => setAIField("prompt", e.target.value)}
              rows={10}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">净化提示词（去除 AI 八股）</span>
              <button
                onClick={resetAICleanupPrompt}
                className="text-[10px] text-amber-400/70 transition active:scale-95"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={shelfSettings.aiConfig.cleanupPrompt}
              onChange={(e) => setAIField("cleanupPrompt", e.target.value)}
              rows={10}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
            />
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-500/5 p-4 text-[11px] leading-relaxed text-zinc-500">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-400/70" />
          <p>
            配置保存后，在阅读器中打开任意章节 → 阅读设置 → 底部「AI 强化本章」「去除 AI 八股」即可使用。
            API Key 存储在本应用数据库中，仅在服务端调用时使用，不会暴露到前端。
          </p>
        </div>
      </section>

      {/* 恢复默认 */}
      <section className="anim-fade-up mt-10" style={{ animationDelay: "0.15s" }}>
        <button
          onClick={resetSettings}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm text-zinc-300 transition active:bg-white/10"
        >
          <RotateCcw size={15} />
          恢复默认阅读设置
        </button>
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-amber-500/5 p-4 text-[11px] leading-relaxed text-zinc-500">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-400/70" />
          <p>
            提示：在安卓 Chrome 中打开本应用后，可通过菜单「添加到主屏幕」将它安装为独立应用，
            获得全屏沉浸的阅读体验。阅读时点击屏幕中央呼出菜单，两侧轻点翻页。
          </p>
        </div>
      </section>

      {toast && (
        <div className="anim-fade-up fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-zinc-800/95 px-4 py-2 text-xs text-zinc-200 shadow-2xl">
          <Check size={13} className="text-emerald-400" />
          {toast}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
