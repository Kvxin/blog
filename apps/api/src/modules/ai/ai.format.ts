// Protect fenced code, inline code and link/image destinations during translation.
// Reject a response that loses or duplicates placeholders rather than saving it.
export function protectMarkdown(fields: Record<string, unknown>, nonce: string) {
  const saved = new Map<string, string>();
  const protect = (value: string) => value.replace(/(^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[ \t]*$)|(`+)([^`\n]*?)\3|(!?\[[^\]\n]*\]\()([^\s)]+)(?=[\s)])/gm,
    (match, fence, _marker, inline, _text, link, url) => {
      const text = link ? url : match;
      const token = `__BLOG_${nonce}_${saved.size}__`;
      saved.set(token, text);
      return link ? link + token : token;
    });
  const prepared: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) prepared[key] = typeof value === 'string' ? protect(value)
    : Array.isArray(value) ? value.map((item) => typeof item === 'string' ? protect(item) : item) : value;
  return { prepared, restore(result: Record<string, unknown>) {
    const flat = JSON.stringify(result);
    for (const token of saved.keys()) {
      if (flat.split(token).length - 1 !== 1) throw new Error('翻译结果丢失或重复代码/链接标记，请重试');
    }
    const restore = (value: string) => {
      let output = value;
      for (const [token, text] of saved) output = output.replace(token, () => text);
      return output;
    };
    return Object.fromEntries(Object.entries(result).map(([key, value]) => [key,
      typeof value === 'string' ? restore(value) : Array.isArray(value) ? value.map((item) => typeof item === 'string' ? restore(item) : item) : value]));
  } };
}
