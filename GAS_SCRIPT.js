// ============================================================
// Google Apps Script（GAS）- 営業記録の書き込み用
// 使い方：
//   1. https://script.google.com/ を開く
//   2. 新しいプロジェクトを作成
//   3. このコードを貼り付けてSHEET_IDを設定
//   4. デプロイ → 新しいデプロイ → ウェブアプリ
//      アクセス：「全員」に設定
//   5. デプロイURLを .env の VITE_GAS_URL に貼り付ける
// ============================================================

const SHEET_ID = "YOUR_SHEET_ID_HERE"; // ← ここに変える

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // 「営業記録」シートがなければ作成
    let sheet = ss.getSheetByName("営業記録");
    if (!sheet) {
      sheet = ss.insertSheet("営業記録");
      sheet.appendRow([
        "記録日時", "施設名", "進捗", "訪問回数",
        "代表者", "対応者", "話した内容", "次のアクション",
        "課題・ニーズ", "メモ"
      ]);
    }

    sheet.appendRow([
      new Date().toLocaleString("ja-JP"),
      data.facilityName || "",
      data.progress || "",
      data.visitCount || 0,
      data.rep || "",
      data.contactName || "",
      data.talkAbout || "",
      data.outcome || "",
      data.concerns || "",
      data.memo || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// テスト用（ブラウザからGETで動作確認）
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "alive", time: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}
