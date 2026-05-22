export function extractJSONText(raw: string): { success: boolean; text: string } {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return { success: false, text: raw };

  const json = cleaned.slice(start, end + 1);
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

  try {
    JSON.parse(result);
    return { success: true, text: result };
  } catch {
    const fixed = result.replace(/,(\s*[}\]])/g, "$1");
    try {
      JSON.parse(fixed);
      return { success: true, text: fixed };
    } catch {
      return { success: false, text: `JSONパースエラー: ${result.slice(0, 300)}` };
    }
  }
}

