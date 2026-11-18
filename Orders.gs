/**
 * ধারা হোস্ট — Google Sheet অর্ডার স্ক্রিপ্ট (সংস্করণ ২)
 *
 * কী করে:
 *  • doPost  → সাইট থেকে আসা নতুন অর্ডার "Orders" ট্যাবে সারি হিসেবে যোগ করে
 *  • doGet   → ট্র্যাক পেজের জন্য অর্ডার ID দিয়ে শুধু স্ট্যাটাস ফেরত দেয়
 *              (নাম, ফোন, ইমেইল, TrxID কখনো ফেরত দেয় না)
 *  • setupOrdersSheet → Status কলামে ড্রপডাউন + রং, আর ডুপ্লিকেট TrxID লাল করে
 *
 * স্ট্যাটাস কলাম (N) এ এই পাঁচটি মানই ব্যবহার করুন:
 *   verifying  → যাচাই চলছে      (নতুন অর্ডারে নিজে বসে)
 *   verified   → TrxID মিলেছে, সেটআপ চলছে
 *   active     → হোস্টিং চালু
 *   problem    → TrxID/টাকায় সমস্যা
 *   cancelled  → বাতিল
 *
 * আপডেট করার নিয়ম (URL একই থাকবে):
 *   Deploy → Manage deployments → ✏️ (Edit) → Version: "New version" → Deploy
 */
var HEADERS = ["Order ID", "Time", "Plan", "Billing", "Amount", "Name", "Phone", "Email", "Domain",
               "Method", "Paid to", "Paid from", "TrxID", "Status"];
var STATUSES = ["verifying", "verified", "active", "problem", "cancelled"];
var MAX_ROWS = 2000;

function getOrdersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Orders");
  if (!sh) { setupOrdersSheet(); sh = ss.getSheetByName("Orders"); }
  return sh;
}

/* ---------- নতুন অর্ডার ---------- */
function doPost(e) {
  var sh = getOrdersSheet_();
  var o = JSON.parse(e.postData.contents);
  sh.appendRow([o.id, o.at, o.plan, o.cycle, o.amount, o.name, "'" + o.phone, o.email, o.domain,
                o.method, "'" + o.paidTo, "'" + o.paidFrom, o.trxId, o.status || "verifying"]);

  // চাইলে নিচের লাইনের // সরিয়ে প্রতিটি অর্ডারে নিজের ইমেইলে নোটিফিকেশন পান:
  // MailApp.sendEmail(Session.getActiveUser().getEmail(), "নতুন অর্ডার " + o.id, JSON.stringify(o, null, 2));

  return ContentService.createTextOutput("ok");
}

/* ---------- স্ট্যাটাস দেখা (ট্র্যাক পেজ) ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = String(p.callback || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,60}$/.test(cb)) cb = "";

  var res = {ok: true, found: false};
  try {
    var id = String(p.id || "").trim().toUpperCase();
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if (id && sh && sh.getLastRow() > 1) {
      var hit = sh.getRange(2, 1, sh.getLastRow() - 1, 1)
                  .createTextFinder(id).matchEntireCell(true).matchCase(false).findNext();
      if (hit) {
        var r = sh.getRange(hit.getRow(), 1, 1, 14).getValues()[0];
        var st = String(r[13] || "").toLowerCase().trim();
        res = {
          ok: true, found: true,
          id: String(r[0]), plan: String(r[2]), cycle: String(r[3]), amount: Number(r[4]),
          status: STATUSES.indexOf(st) >= 0 ? st : "verifying"
        };
      }
    }
  } catch (err) {
    res = {ok: false};
  }

  var text = JSON.stringify(res);
  if (cb) return ContentService.createTextOutput(cb + "(" + text + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- শিট সাজানো (একবার Run করলেই হয়; নতুন শিট তৈরির সময় নিজে চলে) ---------- */
function setupOrdersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Orders") || ss.insertSheet("Orders");
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");

  var statusRange = sh.getRange("N2:N" + MAX_ROWS);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build()
  );

  var colors = {
    verifying: ["#FFF4D6", "#7A4B00"], verified: ["#DDEBFF", "#0B3D91"],
    active: ["#D8F3E4", "#0B5E3C"], problem: ["#FBDADA", "#9B1C1C"], cancelled: ["#E5E7EB", "#374151"]
  };
  var rules = Object.keys(colors).map(function (k) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k)
      .setBackground(colors[k][0]).setFontColor(colors[k][1]).setRanges([statusRange]).build();
  });
  // একই TrxID দুবার এলে লাল
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2<>"",COUNTIF($M$2:$M,$M2)>1)')
    .setBackground("#FBDADA").setRanges([sh.getRange("M2:M" + MAX_ROWS)]).build());
  sh.setConditionalFormatRules(rules);
}