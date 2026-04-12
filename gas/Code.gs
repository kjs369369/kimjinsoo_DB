/**
 * kimjinsoo_DB — Google Apps Script REST API
 *
 * 시트 구조:
 *   Main      : id, section, label, url, icon, platform, note, createdAt
 *   Programs  : id, name, category, status, description, url, github, thumbnail, tags, createdAt, note
 *   Lectures  : id, title, organization, curriculum, date, endDate, lectureType, hours, status, fee,
 *               contactPerson, contactEmail, contactPhone, tags, description, attachments, createdAt
 *   Vault     : id, section, title, subtitle, year, image, url, note, docs,
 *               kyobo1, kyobo2, yes24, aladin, projectPath, github
 *
 * 배포: 웹 앱 → "나" 로 실행, "모든 사용자" 에게 액세스
 */

const SHEET_NAMES = ["Main", "Programs", "Lectures", "Vault"];

// JSON 필드 (배열/객체로 저장해야 하는 컬럼)
const JSON_FIELDS = {
  Programs: ["tags"],
  Lectures: ["tags", "attachments"],
  Vault: ["docs"],
};

// ── helpers ──

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // 헤더 자동 생성
    const headers = getHeaders(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function getHeaders(name) {
  const map = {
    Main: ["id", "section", "label", "url", "icon", "platform", "note", "createdAt"],
    Programs: ["id", "name", "category", "status", "description", "url", "github", "thumbnail", "tags", "createdAt", "note"],
    Lectures: ["id", "title", "organization", "curriculum", "date", "endDate", "lectureType", "hours", "status", "fee", "contactPerson", "contactEmail", "contactPhone", "tags", "description", "attachments", "createdAt"],
    Vault: ["id", "section", "title", "subtitle", "year", "image", "url", "note", "docs", "kyobo1", "kyobo2", "yes24", "aladin", "projectPath", "github"],
  };
  return map[name] || [];
}

function sheetToJson(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const jsonFields = JSON_FIELDS[sheetName] || [];
  return data.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) {
      let val = row[i];
      if (jsonFields.indexOf(h) !== -1 && typeof val === "string" && val) {
        try { val = JSON.parse(val); } catch (e) { /* keep string */ }
      }
      obj[h] = val;
    });
    return obj;
  });
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

function rowFromObj(sheetName, obj) {
  const headers = getHeaders(sheetName);
  const jsonFields = JSON_FIELDS[sheetName] || [];
  return headers.map(function (h) {
    var val = obj[h] !== undefined ? obj[h] : "";
    if (jsonFields.indexOf(h) !== -1 && typeof val !== "string") {
      val = JSON.stringify(val);
    }
    return val;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET: 데이터 조회 ──

function doGet(e) {
  var sheetName = (e.parameter.sheet || "").trim();

  // 전체 시트 요약 (건수)
  if (!sheetName || sheetName === "summary") {
    var summary = {};
    SHEET_NAMES.forEach(function (name) {
      var sheet = getSheet(name);
      var rows = sheet.getLastRow() - 1;
      summary[name] = { count: rows < 0 ? 0 : rows };
    });
    return jsonResponse({ ok: true, data: summary });
  }

  if (SHEET_NAMES.indexOf(sheetName) === -1) {
    return jsonResponse({ ok: false, error: "Invalid sheet: " + sheetName });
  }

  var id = (e.parameter.id || "").trim();
  var rows = sheetToJson(sheetName);

  if (id) {
    var found = rows.filter(function (r) { return String(r.id) === id; });
    return jsonResponse({ ok: true, data: found.length ? found[0] : null });
  }

  return jsonResponse({ ok: true, data: rows });
}

// ── POST: CREATE / UPDATE / DELETE ──

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" });
  }

  var method = (body.method || "create").toLowerCase();
  var sheetName = (body.sheet || "").trim();

  if (SHEET_NAMES.indexOf(sheetName) === -1) {
    return jsonResponse({ ok: false, error: "Invalid sheet: " + sheetName });
  }

  var sheet = getSheet(sheetName);

  // ── CREATE ──
  if (method === "create") {
    var item = body.data || {};
    if (!item.id) item.id = Utilities.getUuid().replace(/-/g, "").substring(0, 12);
    var row = rowFromObj(sheetName, item);
    sheet.appendRow(row);
    return jsonResponse({ ok: true, id: item.id });
  }

  // ── UPDATE ──
  if (method === "update") {
    var item = body.data || {};
    var id = item.id || body.id;
    if (!id) return jsonResponse({ ok: false, error: "id required for update" });
    var rowNum = findRowById(sheet, id);
    if (rowNum === -1) return jsonResponse({ ok: false, error: "Not found: " + id });
    var row = rowFromObj(sheetName, item);
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    return jsonResponse({ ok: true, id: id });
  }

  // ── DELETE ──
  if (method === "delete") {
    var id = body.id || (body.data && body.data.id);
    if (!id) return jsonResponse({ ok: false, error: "id required for delete" });
    var rowNum = findRowById(sheet, id);
    if (rowNum === -1) return jsonResponse({ ok: false, error: "Not found: " + id });
    sheet.deleteRow(rowNum);
    return jsonResponse({ ok: true, id: id });
  }

  // ── BULK (전체 덮어쓰기) ──
  if (method === "bulk") {
    var items = body.data || [];
    // 헤더 유지하고 데이터 영역 삭제
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    items.forEach(function (item) {
      sheet.appendRow(rowFromObj(sheetName, item));
    });
    return jsonResponse({ ok: true, count: items.length });
  }

  return jsonResponse({ ok: false, error: "Unknown method: " + method });
}
