// Google Sheets API連携フック
// SHEET_ID と API_KEY を .env に設定して使う

const SHEET_ID = import.meta.env.VITE_SHEET_ID || "";
const API_KEY  = import.meta.env.VITE_SHEETS_API_KEY || "";
const BASE     = "https://sheets.googleapis.com/v4/spreadsheets";

// シート名 → データ取得
export async function fetchSheet(sheetName) {
  if (!SHEET_ID || !API_KEY) return null;
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const { values } = await res.json();
  if (!values || values.length < 2) return [];
  const [headers, ...rows] = values;
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || "");
    return obj;
  });
}

// 施設マスタをアプリ形式に変換
export function parseFacilities(rows, type) {
  return rows
    .filter(r => r["事業所名称"])
    .map((r, i) => ({
      id: 90000 + i,
      district: r["区名"] || "",
      type: r["サービス名"] || type,
      name: r["事業所名称"] || "",
      tel: r["事業所電話番号"] || "",
      address: r["事業所の所在地"] || "",
      corp: r["法人等名称"] || "",
      nursing: r["看護職員"] === "○",
      careItems: [
        r["吸引"]==="○"?"吸引":null,
        r["経管栄養（胃ろうを含む）"]==="○"?"経管栄養":null,
        r["人工呼吸器の管理"]==="○"?"人工呼吸器":null,
        r["在宅酸素療法"]==="○"?"在宅酸素療法":null,
        r["気管切開部の管理（ガーゼ交換等）"]==="○"?"気管切開":null,
        r["導尿"]==="○"?"導尿":null,
        r["服薬管理"]==="○"?"服薬管理":null,
      ].filter(Boolean),
      fromSheets: true,
    }));
}

// 営業記録をSheetsに書き込む（追記）
// ※ OAuth2必須のため、実用はGAS(Apps Script)経由を推奨
export async function appendVisitToSheets(facilityName, visitData) {
  // Google Apps Script Web App URL経由で書き込む
  const GAS_URL = import.meta.env.VITE_GAS_URL || "";
  if (!GAS_URL) return false;
  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityName, ...visitData }),
    });
    return true;
  } catch { return false; }
}
