import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/test —— 测试 OpenAI 兼容 API 连通性
 * body: { apiUrl, apiKey, model }
 * 不落库，不入日志；用 1 个 token 的最小请求验证配置
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { apiUrl, apiKey, model } = body ?? {};
  if (!apiUrl || !apiKey || !model) {
    return NextResponse.json(
      { ok: false, error: "请先填写 API 地址、Key 和模型名" },
      { status: 400 }
    );
  }
  let origin = "";
  try {
    origin = new URL(apiUrl).origin;
  } catch {
    return NextResponse.json(
      { ok: false, error: "API 地址格式不正确" },
      { status: 400 }
    );
  }
  const start = Date.now();
  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: '只回复两个字：正常' }],
        max_tokens: 16,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
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
    let reply = "";
    try {
      reply = JSON.parse(text).choices?.[0]?.message?.content ?? "";
    } catch {
      /* ignore */
    }
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - start,
      reply: reply.trim().slice(0, 50),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json({
      ok: false,
      error: timedOut
        ? `连接超时（30s），请检查 API 地址与网络（服务器出口需能访问 ${origin}）`
        : "无法连接到 API 地址，请检查网络或地址是否正确",
    });
  }
}
