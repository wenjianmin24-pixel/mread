/**
 * 对话高亮引擎：
 * 遍历渲染后 DOM 中的文本节点，把引号对白包裹为 <span class="dlg">，
 * 颜色由 CSS 变量控制，切换颜色无需重跑高亮。
 * 支持："…" 「…」 『…』 “…” ‘…’ 五种引号。
 */
const DIALOGUE_RE =
  /("[^"\n]{1,300}?"|「[^」\n]{1,300}?」|『[^』\n]{1,300}?』|“[^”\n]{1,300}?”|‘[^’\n]{1,300}?’)/g;

export function highlightDialogue(
  root: HTMLElement,
  opts: { rainbow: boolean; bold: boolean }
) {
  // 先清除旧高亮（展开所有 .dlg / .dlg-cN）
  root.querySelectorAll("span.dlg, span.dlg-c0, span.dlg-c1, span.dlg-c2, span.dlg-c3, span.dlg-c4, span.dlg-c5").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  root.normalize();

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

    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = DIALOGUE_RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      if (opts.rainbow) {
        span.className = `dlg-c${counter % 6}${opts.bold ? " dlg-bold" : ""}`;
        counter += 1;
      } else {
        span.className = `dlg${opts.bold ? " dlg-bold" : ""}`;
      }
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}
