const SHEET_ID = "1GIrAwXXS4j0qrxwAoHKzQTLIxfBEku1KR6Gkmc0PMyk"; // 

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    let sheet = ss.getSheetByName("営業記録");
    if (!sheet) {
      sheet = ss.insertSheet("営業記録");
      sheet.appendRow([
        "記録日時","施設ID","施設名","サービス種別","区","法人名","電話番号","住所",
        "進捗","訪問回数","代表者名","対応者名","役職","名刺有無",
        "訪問日","話した内容","次のアクション","課題・ニーズ","メモ"
      ]);
    }

    sheet.appendRow([
      new Date().toLocaleString("ja-JP"),
      data.facilityId || "",
      data.facilityName || "",
      data.facilityType || "",
      data.district || "",
      data.corp || "",
      data.tel || "",
      data.address || "",
      data.progress || "",
      data.visitCount || 0,
      data.rep || "",
      data.contactName || "",
      data.contactRole || "",
      data.cardReceived || "",
      data.visitDate || "",
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

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "alive", time: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}
