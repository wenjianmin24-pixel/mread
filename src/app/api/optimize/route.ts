import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chapters, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS } from "@/lib/types";

/**
 * POST /api/optimize —— AI 格式强化 / 去除 AI 八股（OpenAI 兼容）
 * body: { chapterId: number, mode?: "enhance" | "cleanup" }
 * 返回: { original, enhanced }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Number.isInteger(body.chapterId)) {
      return NextResponse.json({ error: "缺少 chapterId" }, { status: 400 });
    }
    const mode: "enhance" | "cleanup" =
      body.mode === "cleanup" ? "cleanup" : "enhance";

    const [ch] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, body.chapterId));
    if (!ch) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 取 AI 配置（旧存档可能缺少 cleanupPrompt，回落到默认值）
    const [s] = await db.select().from(settings).limit(1);
    const cfg = ((s?.data as Record<string, unknown>)?.aiConfig ??
      DEFAULT_SETTINGS.aiConfig) as {
      apiUrl: string;
      apiKey: string;
      model: string;
      prompt: string;
      cleanupPrompt?: string;
    };
    const systemPrompt =
      mode === "cleanup"
        ? cfg.cleanupPrompt || DEFAULT_SETTINGS.aiConfig.cleanupPrompt
        : cfg.prompt;

    if (!cfg.apiUrl || !cfg.apiKey || !cfg.model) {
      return NextResponse.json(
        { error: "请先在设置中配置 API 地址、Key 和模型名" },
        { status: 400 }
      );
    }

    // 调用 LLM（OpenAI 兼容 /v1/chat/completions）
    const llmResp = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: ch.content },
        ],
        temperature: 0.3,
        max_tokens: 8192,
      }),
    });

    if (!llmResp.ok) {
      const errText = await llmResp.text().catch(() => "");
      console.error("LLM error:", llmResp.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: `AI 请求失败（${llmResp.status}）` },
        { status: 502 }
      );
    }

    const data = await llmResp.json();
    let enhanced: string = data.choices?.[0]?.message?.content ?? "";

    // 去除可能的代码块包裹
    enhanced = enhanced
      .replace(/^```(?:markdown|md)?\s*\n?/m, "")
      .replace(/\n?```\s*$/m, "")
      .trim();

    if (!enhanced) {
      return NextResponse.json({ error: "AI 返回为空" }, { status: 500 });
    }

    return NextResponse.json({
      original: ch.content,
      enhanced,
    });
  } catch (e) {
    console.error("optimize error:", e);
    return NextResponse.json({ error: "优化请求异常" }, { status: 500 });
  }
}
