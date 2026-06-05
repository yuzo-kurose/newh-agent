// モデル出力の生テキストから JSON を取り出して検証する。
// 1) Markdownフェンス除去 → 2) 文字列内の制御文字をエスケープ → 3) 直接parse
// → 4) 末尾カンマ除去 → 5) 途中で切れたJSONの修復（truncation対策） の順で復旧を試みる。
export function extractJSONText(raw: string): { success: boolean; text: string } {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  if (start === -1) return { success: false, text: raw };

  const end = cleaned.lastIndexOf("}");

  // まずは「最初の { 〜 最後の }」で素直に試す。
  if (end > start) {
    const direct = tryParse(normalizeControlChars(cleaned.slice(start, end + 1)));
    if (direct) return { success: true, text: direct };
  }

  // 上で失敗 or 閉じ } が無い（出力打ち切り）場合は、開始 { から末尾までを修復する。
  const repaired = repairTruncatedJSON(normalizeControlChars(cleaned.slice(start)));
  if (repaired) {
    const ok = tryParse(repaired);
    if (ok) return { success: true, text: ok };
  }

  const fallback = end > start ? normalizeControlChars(cleaned.slice(start, end + 1)) : cleaned.slice(start);
  return { success: false, text: `JSONパースエラー: ${fallback.slice(0, 300)}` };
}

// そのまま、または末尾カンマを除去してパースできれば、その文字列を返す。
function tryParse(s: string): string | null {
  try {
    JSON.parse(s);
    return s;
  } catch {
    const fixed = s.replace(/,(\s*[}\]])/g, "$1");
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }
}

// 文字列値の中に生で混入した制御文字（改行・タブ等）をエスケープ／除去する。
function normalizeControlChars(json: string): string {
  let inString = false;
  let escaped = false;
  let result = "";

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") {
        result += "\\n";
        continue;
      }
      if (ch === "\r") {
        result += "\\r";
        continue;
      }
      if (ch === "\t") {
        result += "\\t";
        continue;
      }
      if (ch.charCodeAt(0) < 32) continue;
    }
    result += ch;
  }

  return result;
}

// 出力が途中で切れたJSONを、開いたままの文字列・括弧を閉じて修復する。
// 末尾の不完全なトークン（書きかけの値・キーのみ・カンマ）は捨ててから閉じる。
function repairTruncatedJSON(s: string): string | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = []; // 閉じるべき括弧を順に積む

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let out = s;

  // 文字列の途中で切れていたら閉じる（書きかけの値はそのまま値として残す）。
  if (inString) out += '"';

  // 末尾の不完全な断片を順に除去する。
  out = out.replace(/,\s*$/, ""); // 末尾カンマ
  out = out.replace(/[,{]\s*"[^"]*"\s*:\s*$/, (m) => (m[0] === "{" ? "{" : "")); // 値のない "key":
  out = out.replace(/[,{]\s*"[^"]*"\s*$/, (m) => (m[0] === "{" ? "{" : "")); // コロンの付かない裸のキー
  out = out.replace(/,\s*$/, "");

  // 開いたままの括弧を閉じる。
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i];

  return out;
}
