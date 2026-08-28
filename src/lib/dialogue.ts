/**
 * 文本氛围渲染引擎：
 * 1. 对话高亮：引号对白包裹为 <span class="dlg">，颜色由 CSS 变量控制
 * 2. 气声识别：对话内含省略号或极短促的 → .dlg-soft（淡化轻语）
 * 3. 心理独白：整段斜体（<em> 全包段落）→ .thought（次级色）
 * 4. 拟声段落：高比例「嗯/啊/呜/哈/呀/噢…」+ 省略号的段落 → .gasp（虚化弱化）
 * 支持："…" 「…」 『…』 “…” ‘…’ 五种引号。
 */

const DIALOGUE_RE =
  /("[^"\n]{1,300}?"|「[^」\n]{1,300}?」|『[^』\n]{1,300}?』|“[^”\n]{1,300}?”|‘[^’\n]{1,300}?’)/g;

/** 对白是否为气声：含省略号，或短促（≤6 字含标点） */
function isSoftDialogue(text: string): boolean {
  if (/……|···|\.\.\.|……/.test(text)) return true;
  // 去引号后极短促且带语气词
  const inner = text.replace(/^[「『“'"‘]|["」』”'’]$/g, "");
  if (inner.length <= 6 && /[嗯啊呜哈呀噢诶欸咦嘛吧呢]/.test(inner)) return true;
  return false;
}

/** 拟声词字符集：呻吟/喘息/情色语境高频词 */
const MOAN_CHARS = "嗯啊呜哈呀噢诶欸咦嘛吧呢唸哼嘶哦喔哇嗷唧噫嘻嘿不要那里停慢快点再深轻";

/** 段落是否为拟声段落：省略号占位高 + 拟声词字符占比高 */
function isGaspParagraph(text: string): boolean {
  const t = text.trim();
  if (t.length < 4 || t.length > 120) return false;
  // 必须含省略号或波浪号
  if (!/……|···|\.\.\.|～|~/.test(t)) return false;
  // 引号内文本
  const inner = t.replace(/[「『“'"‘』」”"’\s，。、？！…～~·]/g, "");
  if (inner.length === 0) return false;
  let moan = 0;
  for (const ch of inner) {
    if (MOAN_CHARS.includes(ch)) moan++;
  }
  return moan / inner.length >= 0.6;
}

export interface HighlightOptions {
  rainbow: boolean;
  bold: boolean;
  mood?: boolean; // 氛围渲染（气声/独白/拟声）
}

export function highlightDialogue(root: HTMLElement, opts: HighlightOptions) {
  const mood = opts.mood ?? false;

  // 先清除旧高亮（展开所有标记 span）
  root.querySelectorAll(
    "span.dlg, span.dlg-c0, span.dlg-c1, span.dlg-c2, span.dlg-c3, span.dlg-c4, span.dlg-c5, span.dlg-soft"
  ).forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  root.normalize();

  /* ---------- 拟声段落：段落级识别 ---------- */
  if (mood) {
    const paras = root.querySelectorAll("p");
    paras.forEach((p) => {
      if (p.classList.contains("gasp")) p.classList.remove("gasp");
      if (p.querySelector("blockquote, pre, table, img, h1, h2, h3")) return;
      const text = p.textContent ?? "";
      if (text && isGaspParagraph(text)) {
        p.classList.add("gasp");
      }
    });
  } else {
    root.querySelectorAll("p.gasp").forEach((p) => p.classList.remove("gasp"));
  }

  /* ---------- 心理独白：整段斜体 → .thought ---------- */
  if (mood) {
    const paras = root.querySelectorAll("p");
    paras.forEach((p) => {
      if (p.classList.contains("thought")) p.classList.remove("thought");
      // 只有一个子节点且为 <em>，或全为 <em>/文本空白组合
      const children = Array.from(p.childNodes).filter(
        (n) => !(n.nodeType === Node.TEXT_NODE && !(n.textContent ?? "").trim())
      );
      if (children.length === 0) return;
      const allEm = children.every((n) => n.nodeName === "EM");
      if (allEm) {
        // 段内文本几乎全被斜体包裹（允许首尾极少量非斜体）
        const total = (p.textContent ?? "").trim().length;
        const emText = children
          .map((n) => (n.textContent ?? ""))
          .join("")
          .trim().length;
        if (total > 0 && emText / total >= 0.85) p.classList.add("thought");
      }
    });
  } else {
    root.querySelectorAll("p.thought").forEach((p) => p.classList.remove("thought"));
  }

  /* ---------- 对话高亮（含气声） ---------- */
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n.nodeValue && /["「『“‘]/.test(n.nodeValue)) textNodes.push(n);
  }

  let counter = 0;
  for (const node of textNodes) {
    const text = node.nodeValue ?? "";
    DIALOGUE_RE.lastIndex = 0;
    if (!DIALOGUE_RE.test(text)) continue;
    DIALOGUE_RE.lastIndex = 0;

    // 独白/拟声段落内的对话不再做气声降级（保持段落语义优先）
    const inMoodPara =
      mood &&
      node.parentElement?.closest &&
      (node.parentElement.closest("p.thought, p.gasp") != null);

    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = DIALOGUE_RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      const base = opts.rainbow ? `dlg-c${counter % 6}` : "dlg";
      const soft = mood && !inMoodPara && isSoftDialogue(m[0]);
      span.className = soft
        ? `dlg-soft${opts.bold ? " dlg-bold" : ""}`
        : `${base}${opts.bold ? " dlg-bold" : ""}`;
      if (soft) {
        // 气声也参与多彩轮换计数，保持节奏
        counter += 1;
      } else if (opts.rainbow) {
        counter += 1;
      }
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}
