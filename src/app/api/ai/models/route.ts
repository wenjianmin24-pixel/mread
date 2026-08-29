import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/models —— 拉取 OpenAI 兼容 API 的模型列表
 * body: { apiUrl, apiKey }
 * 从 chat/completions 地址推导 /v1/models 地址
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { apiUrl, apiKey } = body ?? {};
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { ok: false, error: "请先填写 API 地址和 Key" },
      { status: 400 }
    );
  }
  let base: string;
  try {
    base = apiUrl.replace(/\/chat\/completions\/?.*$/, "").replace(/\/$/, "");
    new URL(base + "/models");
  } catch {
    return NextResponse.json(
      { ok: false, error: "API 地址格式不正确" },
      { status: 400 }
    );
  }
  try {
    const resp = await fetch(base + "/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000),
    });
    const text = await resp.text();
    if (!resp.ok) {
      let msg = text.slice(0, 200);
      try {
        msg = JSON.parse(text)?.error?.message ?? msg;
      } catch {
        /* 保留原文 */
      }
      return NextResponse.json({ ok: false, error: `HTTP ${resp.status}：${msg}` });
    }
    const j = JSON.parse(text);
    const models: string[] = (j.data ?? j.models ?? [])
      .map((m: { id?: string; name?: string }) => m.id ?? m.name ?? "")
      .filter(Boolean)
      .sort();
    return NextResponse.json({ ok: true, models });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json({
      ok: false,
      error: timedOut ? "拉取超时（20s）" : "无法连接到 API 地址",
    });
  }
}
