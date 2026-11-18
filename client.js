(function () {
"use strict";
var API = "https://script.google.com/macros/s/AKfycbxTemlO1gS8xRVnXvDn1ozF5ROQCcm3wZJYyDIXqwUpP5J_Zp43tyX7070J-dvxBYg3mw/exec";
var SUPPORT_WA = "https://wa.me/8801688230246";
var PAY = {
  bkash: {name: "বিকাশ", num: "01688230246"},
  nagad: {name: "নগদ", num: "9856 0000 4117 9330"}
};
var st = {sess: null, renewing: null, method: "bkash", tab: "login", err: "", notice: "", admin: null};
try { st.sess = JSON.parse(sessionStorage.getItem("dh_client") || "null"); } catch (e) {}
try { st.admin = sessionStorage.getItem("dh_admin") || null; } catch (e) {}

function root() { return document.getElementById("clientWrap"); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function money(n) { return "৳" + Number(n).toLocaleString("en-US"); }
function dateBn(iso) { return new Date(iso).toLocaleDateString("bn-BD", {timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric"}); }
function val(id) { return document.getElementById(id).value.trim(); }
function hasErr(j, code) { return !!(j && j.error && String(j.error).indexOf(code) >= 0); }
function api(params) {
  var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
  return fetch(API + "?" + q).then(function (r) { return r.json(); });
}
function saveSess() { try { sessionStorage.setItem("dh_client", JSON.stringify(st.sess)); } catch (e) {} }
function logout() { st.sess = null; st.renewing = null; st.err = ""; try { sessionStorage.removeItem("dh_client"); } catch (e) {} render(); }
function isAdminRoute() { return location.hash.indexOf("#/admin") === 0; }

function render() {
  if (!root()) return;
  if (isAdminRoute()) return adminView();
  if (!st.sess) return loginView();
  if (st.renewing) return renewView();
  return dashView();
}

/* ================= ক্লায়েন্ট: লগইন / প্রথমবার PIN সেট ================= */

function loginView() {
  var tabs = '<div class="mtabs" role="tablist">' +
    '<button type="button" class="mtab" data-tab="login" aria-pressed="' + (st.tab === "login") + '">লগইন</button>' +
    '<button type="button" class="mtab" data-tab="setup" aria-pressed="' + (st.tab === "setup") + '">প্রথমবার PIN সেট</button></div>';
  var notice = st.notice ? '<p class="sub" style="color:var(--ok)">' + esc(st.notice) + '</p>' : "";
  var body = st.tab === "setup" ? setupForm() : loginForm();
  root().innerHTML = '<div class="card" style="max-width:460px;margin:0 auto"><h2>আমার অ্যাকাউন্ট</h2>' + tabs + notice + body + '</div>';
  st.notice = "";
  root().querySelectorAll("[data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { st.tab = b.getAttribute("data-tab"); st.err = ""; loginView(); });
  });
  if (st.tab === "setup") bindSetup(); else bindLogin();
}

function loginForm() {
  return '<p class="sub">ফোন নম্বর ও আপনার নিজের PIN দিয়ে লগইন করুন।</p>' +
    '<form id="loginForm" novalidate><div class="fields">' +
    '<label class="full">মোবাইল নম্বর<input id="l-phone" inputmode="tel" placeholder="01XXXXXXXXX"></label>' +
    '<label class="full">PIN<input id="l-pin" type="password" inputmode="numeric"></label></div>' +
    '<p class="err" role="alert">' + esc(st.err) + '</p>' +
    '<div class="actions"><button class="btn" type="submit">লগইন</button></div>' +
    '<p class="sub" style="margin-top:14px;font-size:14px">PIN ভুলে গেলে <a href="' + SUPPORT_WA + '" target="_blank" rel="noopener">WhatsApp-এ জানান</a>।</p></form>';
}

function setupForm() {
  return '<p class="sub">অর্ডারের সময় যে ফোন ও ইমেইল দিয়েছিলেন সেগুলো দিয়ে যাচাই করে নিজের PIN সেট করুন।</p>' +
    '<form id="setupForm" novalidate><div class="fields">' +
    '<label class="full">মোবাইল নম্বর<input id="s-phone" inputmode="tel" placeholder="01XXXXXXXXX"></label>' +
    '<label class="full">অর্ডারের ইমেইল<input id="s-email" type="email"></label>' +
    '<label>নতুন PIN (৪–৬ সংখ্যা)<input id="s-pin" type="password" inputmode="numeric"></label>' +
    '<label>PIN আবার লিখুন<input id="s-pin2" type="password" inputmode="numeric"></label></div>' +
    '<p class="err" role="alert">' + esc(st.err) + '</p>' +
    '<div class="actions"><button class="btn" type="submit">PIN সেট করুন</button></div></form>';
}

function bindLogin() {
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var phone = val("l-phone"), pin = val("l-pin"), btn = e.target.querySelector("button");
    btn.disabled = true;
    api({action: "login", phone: phone, pin: pin}).then(function (j) {
      btn.disabled = false;
      if (j.error) {
        st.err = hasErr(j, "bad_login") ? "ফোন বা PIN ভুল।" : "সার্ভারে সমস্যা, আবার চেষ্টা করুন।";
        return loginView();
      }
      st.err = "";
      st.sess = {phone: phone, pin: pin, name: j.name, services: j.services}; saveSess(); render();
    }).catch(function () {
      btn.disabled = false; st.err = "সংযোগে সমস্যা, আবার চেষ্টা করুন।"; loginView();
    });
  });
}

function bindSetup() {
  document.getElementById("setupForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var phone = val("s-phone"), email = val("s-email"), pin = val("s-pin"), pin2 = val("s-pin2");
    if (!/^\d{4,6}$/.test(pin)) { st.err = "PIN ৪–৬ সংখ্যার হতে হবে।"; return loginView(); }
    if (pin !== pin2) { st.err = "দুটি PIN মিলছে না।"; return loginView(); }
    var btn = e.target.querySelector("button");
    btn.disabled = true;
    api({action: "setup", phone: phone, email: email, pin: pin}).then(function (j) {
      btn.disabled = false;
      if (hasErr(j, "already_set")) st.err = "এই অ্যাকাউন্টের PIN আগেই সেট করা আছে। লগইন করুন, বা PIN ভুলে গেলে WhatsApp-এ জানান।";
      else if (j.error) st.err = "তথ্য মেলেনি। ফোন ও ইমেইল আবার যাচাই করুন।";
      else { st.tab = "login"; st.err = ""; st.notice = "PIN সেট হয়েছে। এখন নতুন PIN দিয়ে লগইন করুন।"; }
      loginView();
    }).catch(function () {
      btn.disabled = false; st.err = "সংযোগে সমস্যা, আবার চেষ্টা করুন।"; loginView();
    });
  });
}

function refresh() {
  return api({action: "login", phone: st.sess.phone, pin: st.sess.pin}).then(function (j) {
    if (hasErr(j, "bad_login")) { logout(); return; }
    if (j.error) { alert("আপডেট করা যায়নি, আবার চেষ্টা করুন।"); return; }
    st.sess.name = j.name; st.sess.services = j.services; saveSess(); render();
  }).catch(function () { alert("সংযোগে সমস্যা, আবার চেষ্টা করুন।"); });
}

function dashView() {
  var s = st.sess;
  var cards = s.services.length ? s.services.map(function (v) {
    var badge = v.status === "expired" ? '<span class="status" style="background:var(--bkash-bg);color:var(--err)">মেয়াদ শেষ</span>'
      : v.status === "soon" ? '<span class="status">শিগগিরই শেষ</span>'
      : '<span class="status ok">সক্রিয়</span>';
    return '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div><small style="color:var(--muted)">' + (v.type === "domain" ? "ডোমেইন" : "হোস্টিং") + '</small>' +
      '<h3 style="font-size:20px;overflow-wrap:anywhere">' + esc(v.name) + '</h3>' +
      '<p class="sub" style="margin:4px 0 0">মেয়াদ শেষ: ' + esc(dateBn(v.expiry)) + ' (' + (v.days < 0 ? "শেষ হয়ে গেছে" : v.days + " দিন বাকি") + ')</p></div>' +
      '<div>' + badge + '</div></div>' +
      (v.renew_price ? '<div class="actions"><button class="btn sm" type="button" data-renew="' + esc(v.id) + '">রিনিউ — ' + money(v.renew_price) + ' (' + v.renew_months + ' মাস)</button></div>' : "") +
      '</div>';
  }).join("") : '<p class="sub">কোনো ডোমেইন বা হোস্টিং পাওয়া যায়নি।</p>';

  root().innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">' +
    '<h2>স্বাগতম, ' + esc(s.name) + '</h2><div class="actions" style="margin:0">' +
    '<button class="btn ghost sm" type="button" id="cRefresh">রিফ্রেশ</button>' +
    '<button class="btn ghost sm" type="button" id="cLogout">লগআউট</button></div></div>' + cards;

  root().querySelectorAll("[data-renew]").forEach(function (b) {
    b.addEventListener("click", function () { st.renewing = b.getAttribute("data-renew"); st.method = "bkash"; render(); });
  });
  document.getElementById("cRefresh").addEventListener("click", refresh);
  document.getElementById("cLogout").addEventListener("click", logout);
}

function renewView() {
  var v = st.sess.services.filter(function (x) { return x.id === st.renewing; })[0];
  if (!v) { st.renewing = null; return dashView(); }
  var m = st.method;
  root().innerHTML =
    '<button class="back" id="rBack" type="button">← ফিরে যান</button>' +
    '<div class="card" style="max-width:560px"><h2>রিনিউ: ' + esc(v.name) + '</h2>' +
    '<p class="sub">' + v.renew_months + ' মাসের জন্য <b>' + money(v.renew_price) + '</b> পাঠান।</p>' +
    '<div class="mtabs" role="group" aria-label="পেমেন্টের মাধ্যম">' +
    '<button type="button" class="mtab" data-m="bkash" aria-pressed="' + (m === "bkash") + '" style="--mc:var(--bkash);--mc-bg:var(--bkash-bg)">বিকাশ</button>' +
    '<button type="button" class="mtab" data-m="nagad" aria-pressed="' + (m === "nagad") + '" style="--mc:var(--nagad);--mc-bg:var(--nagad-bg)">নগদ</button></div>' +
    '<div class="paybox" style="margin-bottom:18px"><div><span class="lbl">প্রাপক নম্বর</span>' +
    '<div class="numrow"><span class="num" id="rNum" style="font-size:22px">' + esc(PAY[m].num) + '</span></div></div></div>' +
    '<form id="renewForm" novalidate><div class="fields">' +
    '<label>আপনার নম্বর<input id="r-sender" inputmode="tel" placeholder="01XXXXXXXXX"></label>' +
    '<label>TrxID<input id="r-trx" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-family:var(--mono);text-transform:uppercase"></label></div>' +
    '<label class="chk"><input type="checkbox" id="r-ok"><span>আমি উপরের নম্বরে সঠিক পরিমাণ টাকা পাঠিয়েছি</span></label>' +
    '<p class="err" id="r-err" role="alert"></p>' +
    '<div class="actions"><button class="btn" type="submit">রিনিউ অর্ডার জমা দিন</button></div></form></div>';

  document.getElementById("rBack").addEventListener("click", function () { st.renewing = null; render(); });
  root().querySelectorAll(".mtab").forEach(function (b) {
    b.addEventListener("click", function () {
      st.method = b.getAttribute("data-m");
      root().querySelectorAll(".mtab").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      document.getElementById("rNum").textContent = PAY[st.method].num;
    });
  });
  document.getElementById("renewForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("r-err");
    var sender = document.getElementById("r-sender").value.replace(/\D/g, "");
    var trx = document.getElementById("r-trx").value.toUpperCase().replace(/[\s-]/g, "");
    if (!/^01\d{9}$/.test(sender)) { err.textContent = "সঠিক নম্বর দিন"; return; }
    if (!/^[A-Z0-9]{8,12}$/.test(trx)) { err.textContent = "TrxID ৮–১২ অক্ষরের হবে"; return; }
    if (!document.getElementById("r-ok").checked) { err.textContent = "নিশ্চিত করতে টিক দিন"; return; }
    err.textContent = "জমা হচ্ছে…";
    api({action: "renew", phone: st.sess.phone, pin: st.sess.pin, service_id: v.id,
         method: st.method, sender: sender, trx: trx}).then(function (j) {
      if (j.error === "dup_trx") { err.textContent = "এই TrxID আগেই জমা হয়েছে"; return; }
      if (hasErr(j, "bad_login")) { logout(); return; }
      if (j.error) { err.textContent = "জমা দেওয়া যায়নি, আবার চেষ্টা করুন"; return; }
      st.renewing = null;
      root().innerHTML = '<div class="card" style="max-width:560px"><h2>রিনিউ অর্ডার জমা হয়েছে</h2>' +
        '<p class="sub">অর্ডার ID: <b style="font-family:var(--mono)">' + esc(j.order_id) + '</b></p>' +
        '<p class="sub">যাচাই শেষে মেয়াদ স্বয়ংক্রিয়ভাবে বাড়বে।</p>' +
        '<div class="actions"><button class="btn" type="button" id="backDash">ড্যাশবোর্ডে ফিরুন</button></div></div>';
      document.getElementById("backDash").addEventListener("click", refresh);
    }).catch(function () { err.textContent = "সংযোগে সমস্যা, আবার চেষ্টা করুন"; });
  });
}

/* ================= অ্যাডমিন (#/admin, মেনুতে নেই) ================= */

function isUnauth(j) { return hasErr(j, "unauthorized"); }

function adminLogout() {
  st.admin = null; st.err = "";
  try { sessionStorage.removeItem("dh_admin"); } catch (e) {}
  render();
}

function adminLogin() {
  root().innerHTML = '<div class="card" style="max-width:420px;margin:0 auto"><h2>অ্যাডমিন লগইন</h2>' +
    '<form id="aLogin" novalidate><label class="full">অ্যাডমিন কী<input id="a-key" type="password" autocomplete="off"></label>' +
    '<p class="err" role="alert">' + esc(st.err) + '</p>' +
    '<div class="actions"><button class="btn" type="submit">প্রবেশ করুন</button></div></form></div>';
  document.getElementById("aLogin").addEventListener("submit", function (e) {
    e.preventDefault();
    var key = val("a-key"), btn = e.target.querySelector("button");
    btn.disabled = true;
    api({action: "admin_orders", key: key}).then(function (j) {
      btn.disabled = false;
      if (isUnauth(j)) { st.err = "অ্যাডমিন কী ভুল।"; return adminLogin(); }
      if (j.error) { st.err = "সার্ভারে সমস্যা, আবার চেষ্টা করুন।"; return adminLogin(); }
      st.err = ""; st.admin = key;
      try { sessionStorage.setItem("dh_admin", key); } catch (er) {}
      adminView();
    }).catch(function () {
      btn.disabled = false; st.err = "সংযোগে সমস্যা, আবার চেষ্টা করুন।"; adminLogin();
    });
  });
}

function adminView() {
  if (!st.admin) return adminLogin();
  root().innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">' +
    '<h2>অ্যাডমিন প্যানেল</h2><button class="btn ghost sm" type="button" id="aOut">লগআউট</button></div>' +
    '<div class="card" style="margin-bottom:18px"><h3 style="font-size:20px;margin-bottom:10px">যাচাইয়ের অপেক্ষায় রিনিউ</h3>' +
    '<div id="aOrders"></div>' +
    '<button class="btn ghost sm" id="aReload" type="button" style="margin-top:12px">রিফ্রেশ</button></div>' +
    '<div class="card"><h3 style="font-size:20px;margin-bottom:10px">PIN রিসেট</h3>' +
    '<p class="sub">ক্লায়েন্ট PIN ভুলে গেলে তার নম্বর দিন। এরপর সে নিজে নতুন PIN সেট করতে পারবে।</p>' +
    '<form id="aReset" novalidate><div class="fields"><label class="full">ক্লায়েন্টের মোবাইল নম্বর<input id="a-phone" inputmode="tel" placeholder="01XXXXXXXXX"></label></div>' +
    '<p class="err" id="a-rerr" role="alert"></p>' +
    '<div class="actions"><button class="btn" type="submit">PIN মুছুন</button></div></form></div>';

  document.getElementById("aOut").addEventListener("click", adminLogout);
  document.getElementById("aReload").addEventListener("click", loadOrders);
  document.getElementById("aReset").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("a-rerr"), phone = val("a-phone");
    if (!phone) { err.textContent = "নম্বর দিন"; return; }
    api({action: "admin_reset", key: st.admin, phone: phone}).then(function (j) {
      if (isUnauth(j)) return adminLogout();
      err.textContent = j.error ? "এই নম্বরে ক্লায়েন্ট পাওয়া যায়নি।" : "PIN মুছে ফেলা হয়েছে।";
      if (!j.error) err.style.color = "var(--ok)";
    });
  });
  loadOrders();
}

function loadOrders() {
  var box = document.getElementById("aOrders");
  if (!box) return;
  box.innerHTML = '<p class="sub">লোড হচ্ছে…</p>';
  api({action: "admin_orders", key: st.admin}).then(function (j) {
    if (isUnauth(j)) return adminLogout();
    if (j.error) { box.innerHTML = '<p class="err" role="alert">লোড করা যায়নি।</p>'; return; }
    if (!j.orders.length) { box.innerHTML = '<p class="sub">কোনো অপেক্ষমাণ অর্ডার নেই।</p>'; return; }
    box.innerHTML = j.orders.map(function (o) {
      return '<div class="orow"><div><b>' + esc(o.order_id) + '</b>' +
        '<small>' + esc(o.name + " · " + o.phone) + '</small>' +
        '<small>' + esc(o.service + " · " + o.method) + ' · প্রেরক ' + esc(o.sender) + ' · TrxID ' + esc(o.trx) + '</small></div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-family:var(--display)">' + money(o.amount) + '</b>' +
        '<button class="btn sm" type="button" data-ok="' + esc(o.order_id) + '">নিশ্চিত</button>' +
        '<button class="btn ghost sm" type="button" data-no="' + esc(o.order_id) + '">বাতিল</button></div></div>';
    }).join("");
    box.querySelectorAll("[data-ok]").forEach(function (b) {
      b.addEventListener("click", function () { decide("admin_confirm", b.getAttribute("data-ok")); });
    });
    box.querySelectorAll("[data-no]").forEach(function (b) {
      b.addEventListener("click", function () { decide("admin_reject", b.getAttribute("data-no")); });
    });
  }).catch(function () { box.innerHTML = '<p class="err" role="alert">সংযোগে সমস্যা।</p>'; });
}

function decide(action, orderId) {
  if (action === "admin_confirm" && !confirm("অর্ডার " + orderId + " নিশ্চিত করবেন? মেয়াদ বাড়বে।")) return;
  api({action: action, key: st.admin, order_id: orderId}).then(function (j) {
    if (isUnauth(j)) return adminLogout();
    if (j.error) alert("ব্যর্থ: " + j.error);
    loadOrders();
  });
}

window.ClientArea = {render: render};

/* পাতা সরাসরি #/client বা #/admin দিয়ে খুললে */
if (/^#\/(client|admin)/.test(location.hash)) render();
})();
