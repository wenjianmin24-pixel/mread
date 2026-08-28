"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Quote, Type as TypeIcon, Palette, Rows3 } from "lucide-react";
import {
  DIALOGUE_COLORS,
  FONT_STACKS,
  THEME_PRESETS,
  type ReaderSettings,
} from "@/lib/types";

interface FontMeta {
  id: number;
  name: string;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className="tabular-nums opacity-50">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/15 accent-current"
      />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof TypeIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider opacity-60">
        <Icon size={13} />
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function ReaderSettingsPanel({
  settings,
  onChange,
}: {
  settings: ReaderSettings;
  onChange: (s: ReaderSettings) => void;
}) {
  const [fonts, setFonts] = useState<FontMeta[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(true);

  useEffect(() => {
    fetch("/api/fonts")
      .then((r) => r.json())
      .then((d) => setFonts(d.fonts ?? []))
      .finally(() => setLoadingFonts(false));
  }, []);

  const set = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const builtinFonts = [
    { id: "system", name: "系统默认" },
    { id: "serif", name: "思源宋体" },
    { id: "sans", name: "黑体" },
    { id: "rounded", name: "圆体" },
  ];

  return (
    <div className="max-h-[62dvh] overflow-y-auto px-5 pb-8 pt-1 no-scrollbar">
      {/* 字体 */}
      <Section icon={TypeIcon} title="字体">
        <div className="grid grid-cols-4 gap-2">
          {builtinFonts.map((f) => (
            <button
              key={f.id}
              onClick={() => set("fontFamily", f.id)}
              className={`relative rounded-xl border py-2.5 text-center transition active:scale-95 ${
                settings.fontFamily === f.id
                  ? "border-current"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              <span className="block text-lg leading-none" style={{ fontFamily: FONT_STACKS[f.id] }}>
                永
              </span>
              <span className="mt-1 block text-[10px] opacity-70">{f.name}</span>
              {settings.fontFamily === f.id && (
                <Check size={11} className="absolute right-1 top-1" />
              )}
            </button>
          ))}
          {fonts.map((f) => {
            const fid = `custom:${f.id}`;
            return (
              <button
                key={fid}
                onClick={() => set("fontFamily", fid)}
                className={`relative rounded-xl border py-2.5 text-center transition active:scale-95 ${
                  settings.fontFamily === fid ? "border-current" : "border-black/10"
                }`}
              >
                <span
                  className="block text-lg leading-none"
                  style={{ fontFamily: `"custom-font-${f.id}"` }}
                >
                  永
                </span>
                <span className="mx-auto mt-1 block max-w-full truncate px-1 text-[10px] opacity-70">
                  {f.name}
                </span>
                {settings.fontFamily === fid && (
                  <Check size={11} className="absolute right-1 top-1" />
                )}
              </button>
            );
          })}
          {loadingFonts && (
            <div className="flex items-center justify-center rounded-xl border border-black/10 py-2.5">
              <Loader2 size={14} className="animate-spin opacity-50" />
            </div>
          )}
        </div>
        {fonts.length === 0 && !loadingFonts && (
          <p className="mt-2 text-[10px] opacity-45">
            在「书架 → 设置 → 我的字体」中可导入 .ttf / .otf / .woff2 字体
          </p>
        )}
      </Section>

      {/* 排版 */}
      <Section icon={Rows3} title="排版">
        <div className="space-y-4 rounded-2xl border border-black/8 bg-black/[0.03] p-4">
          <Slider
            label="字号"
            value={settings.fontSize}
            min={14}
            max={28}
            step={1}
            display={`${settings.fontSize}px`}
            onChange={(v) => set("fontSize", v)}
          />
          <Slider
            label="行高"
            value={settings.lineHeight}
            min={1.4}
            max={2.6}
            step={0.1}
            display={settings.lineHeight.toFixed(1)}
            onChange={(v) => set("lineHeight", v)}
          />
          <Slider
            label="段距"
            value={settings.paragraphSpacing}
            min={0.2}
            max={2}
            step={0.1}
            display={`${settings.paragraphSpacing.toFixed(1)}em`}
            onChange={(v) => set("paragraphSpacing", v)}
          />
          <Slider
            label="字间距"
            value={settings.letterSpacing}
            min={0}
            max={3}
            step={0.5}
            display={`${settings.letterSpacing}px`}
            onChange={(v) => set("letterSpacing", v)}
          />
          <Slider
            label="页边距"
            value={settings.sidePadding}
            min={10}
            max={48}
            step={2}
            display={`${settings.sidePadding}px`}
            onChange={(v) => set("sidePadding", v)}
          />
          <div style={settings.pageMode === "paged" ? { opacity: 0.35, pointerEvents: "none" } : undefined}>
            <Slider
              label="页宽（仅滚动模式）"
              value={settings.contentWidth}
              min={70}
              max={100}
              step={5}
              display={`${settings.contentWidth}%`}
              onChange={(v) => set("contentWidth", v)}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs opacity-70">首行缩进两字符</span>
            <Toggle on={settings.firstLineIndent} onClick={() => set("firstLineIndent", !settings.firstLineIndent)} />
          </div>
        </div>
      </Section>

      {/* 对话着色 */}
      <Section icon={Quote} title="对话着色">
        <div className="space-y-3.5 rounded-2xl border border-black/8 bg-black/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-70">高亮引号对白</span>
            <Toggle on={settings.dialogueEnabled} onClick={() => set("dialogueEnabled", !settings.dialogueEnabled)} />
          </div>
          {settings.dialogueEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-70">
                  氛围渲染
                  <span className="ml-1 text-[10px] opacity-60">气声·独白·拟声</span>
                </span>
                <Toggle on={settings.moodStyling} onClick={() => set("moodStyling", !settings.moodStyling)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-70">多彩轮换（不同对白不同色）</span>
                <Toggle on={settings.dialogueRainbow} onClick={() => set("dialogueRainbow", !settings.dialogueRainbow)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-70">对白加粗</span>
                <Toggle on={settings.dialogueBold} onClick={() => set("dialogueBold", !settings.dialogueBold)} />
              </div>
              {!settings.dialogueRainbow && (
                <div>
                  <p className="mb-2 text-xs opacity-70">对白颜色</p>
                  <div className="flex items-center gap-2.5">
                    {DIALOGUE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => set("dialogueColor", c.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90"
                        style={{ background: c.id }}
                        aria-label={c.name}
                      >
                        {settings.dialogueColor === c.id && <Check size={13} className="text-white" />}
                      </button>
                    ))}
                    <label
                      className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-black/25"
                      title="自定义颜色"
                    >
                      <input
                        type="color"
                        value={settings.dialogueColor}
                        onChange={(e) => set("dialogueColor", e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <span
                        className="h-5 w-5 rounded-full"
                        style={{
                          background: DIALOGUE_COLORS.some((c) => c.id === settings.dialogueColor)
                            ? "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"
                            : settings.dialogueColor,
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
              <p
                className="rounded-xl bg-black/5 p-3 text-[13px] leading-relaxed opacity-80"
                style={{ fontFamily: FONT_STACKS[settings.fontFamily] ?? settings.fontFamily }}
              >
                预览：她抬起头，
                <span
                  style={settings.dialogueRainbow ? { color: "#b3541e" } : { color: settings.dialogueColor }}
                  className={settings.dialogueBold ? "font-semibold" : ""}
                >
                  「今晚的星星，是夜航人的灯。」
                </span>
                {settings.dialogueRainbow && (
                  <>
                    他笑着回答：
                    <span style={{ color: "#2563a8" }} className={settings.dialogueBold ? "font-semibold" : ""}>
                      “那就顺着光走。”
                    </span>
                  </>
                )}
              </p>
              {settings.moodStyling && (
                <div className="space-y-1.5 rounded-xl bg-black/5 p-3 text-[13px] leading-relaxed opacity-80">
                  <p className="!m-0 italic opacity-60">
                    气声：「……嗯、别、别在这里……」
                  </p>
                  <p className="!m-0 italic" style={{ color: "inherit", opacity: 0.72, paddingLeft: "1.2em", borderLeft: "2px solid rgba(128,128,128,0.25)" }}>
                    独白：他不会发现吧……这样想着，指尖却在颤抖。
                  </p>
                  <p className="!m-0 italic opacity-50 tracking-[0.18em]">
                    拟声：嗯……啊……呜……
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* 主题 */}
      <Section icon={Palette} title="主题配色">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-black/8 bg-black/[0.03] px-4 py-3">
          <span className="text-xs opacity-70">跟随系统深浅色自动切换</span>
          <Toggle
            on={settings.followSystem}
            onClick={() => set("followSystem", !settings.followSystem)}
          />
        </div>
        {settings.followSystem ? (
          <div className="space-y-3.5">
            {(
              [
                { key: "dayTheme", label: "日间主题", dark: false },
                { key: "nightTheme", label: "夜间主题", dark: true },
              ] as const
            ).map((grp) => (
              <div key={grp.key}>
                <p className="mb-1.5 flex items-center justify-between text-[10px] tracking-widest opacity-45">
                  <span>{grp.label}</span>
                  <span className="tracking-normal opacity-80">
                    {THEME_PRESETS.find((t) => t.id === settings[grp.key])?.name ?? "—"}
                  </span>
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {THEME_PRESETS.filter((t) => t.dark === grp.dark && t.id !== "custom").map((t) => {
                    const active = settings[grp.key] === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => set(grp.key, t.id)}
                        className={`relative rounded-lg border-2 py-1.5 transition active:scale-95 ${
                          active ? "border-current" : "border-transparent"
                        }`}
                        style={{ background: t.bg }}
                      >
                        <span className="block text-center text-[11px] leading-none" style={{ color: t.fg }}>
                          文
                        </span>
                        {active && (
                          <Check size={9} className="absolute right-0.5 top-0.5" style={{ color: t.fg }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3.5">
            {([
              { label: "亮色", dark: false },
              { label: "暗色 · 夜间护眼", dark: true },
            ] as const).map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 mt-1 text-[10px] tracking-widest opacity-45">{group.label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_PRESETS.filter((t) => t.dark === group.dark).map((t) => {
                    const active = settings.theme === t.id;
                    const bg = t.id === "custom" ? settings.customBg : t.bg;
                    const fg = t.id === "custom" ? settings.customFg : t.fg;
                    return (
                      <button
                        key={t.id}
                        onClick={() =>
                          t.id === "boxmocha"
                            ? onChange({
                                ...settings,
                                theme: t.id,
                                dialogueColor: "#a6e3a1",
                                fontFamily: "system",
                                lineHeight: 1.8,
                                paragraphSpacing: 0.6,
                                firstLineIndent: false,
                                letterSpacing: 0,
                              })
                            : set("theme", t.id)
                        }
                        className={`relative overflow-hidden rounded-xl border-2 py-2 transition active:scale-95 ${
                          active ? "border-current" : "border-transparent"
                        }`}
                        style={{ background: bg }}
                      >
                        <span className="block text-center text-lg leading-none" style={{ color: fg }}>
                          文
                        </span>
                        <span className="mt-1 block text-center text-[10px]" style={{ color: fg, opacity: 0.7 }}>
                          {t.name}
                        </span>
                        {active && (
                          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full" style={{ background: fg }}>
                            <Check size={9} style={{ color: bg }} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {settings.theme === "custom" && (
              <div className="mt-3 flex items-center gap-5 rounded-2xl border border-black/8 bg-black/[0.03] p-4">
                <ColorField label="背景色" value={settings.customBg} onChange={(v) => set("customBg", v)} />
                <ColorField label="文字色" value={settings.customFg} onChange={(v) => set("customFg", v)} />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 翻页与其他 */}
      <Section icon={Rows3} title="翻页与显示">
        <div className="space-y-3.5 rounded-2xl border border-black/8 bg-black/[0.03] p-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "scroll", name: "垂直滚动" },
                { id: "paged", name: "横向翻页" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => set("pageMode", m.id)}
                className={`rounded-xl border py-2.5 text-xs transition active:scale-95 ${
                  settings.pageMode === m.id ? "border-current font-semibold" : "border-black/10 opacity-60"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          <Slider
            label="亮度"
            value={settings.brightness}
            min={0.3}
            max={1}
            step={0.05}
            display={`${Math.round(settings.brightness * 100)}%`}
            onChange={(v) => set("brightness", v)}
          />
          <div style={settings.pageMode === "paged" ? { opacity: 0.35, pointerEvents: "none" } : undefined}>
            <Slider
              label="自动滚屏速度"
              value={settings.autoScrollSpeed}
              min={20}
              max={200}
              step={10}
              display={`${settings.autoScrollSpeed}px/s`}
              onChange={(v) => set("autoScrollSpeed", v)}
            />
            <p className="mt-1.5 text-[10px] opacity-45">
              点底部工具栏 ▶ 启动；滚动中触碰屏幕即暂停
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-70">屏幕常亮</span>
            <Toggle on={settings.keepAwake} onClick={() => set("keepAwake", !settings.keepAwake)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-70">底部进度栏</span>
            <Toggle on={settings.showFooter} onClick={() => set("showFooter", !settings.showFooter)} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
        on ? "bg-current" : "bg-black/20"
      }`}
      style={on ? { opacity: 0.9 } : undefined}
      aria-pressed={on}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
      <span className="relative h-9 w-9 overflow-hidden rounded-full border border-black/15 shadow-inner" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
      <span>
        <span className="block text-xs opacity-70">{label}</span>
        <span className="block font-mono text-[10px] uppercase opacity-45">{value}</span>
      </span>
    </label>
  );
}
