(function () {
"use strict";
var API = "https://script.google.com/macros/s/AKfycbxTemlO1gS8xRVnXvDn1ozF5ROQCcm3wZJYyDIXqwUpP5J_Zp43tyX7070J-dvxBYg3mw/exec";
var PAY = {
  bkash: {name: "বিকাশ", num: "01688230246"},
  nagad: {name: "নগদ", num: "9856 0000 4117 9330"}
};
var st = {sess: null, renewing: null, method: "bkash"};
try { st.sess = JSON.parse(sessionStorage.getItem("dh_client") || "null"); } catch (e) {}

function root() { return document.getElementById("clientWrap"); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
function money(n) { return "৳" + Number(n).toLocaleString("en-US"); }
function dateBn(iso) { return new Date(iso).toLocaleDateString("bn-BD", {timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric"}); }
function isBadLogin(j) { return !!(j && j.error && String(j.error).indexOf("bad_login") >= 0); }

function api(params) {
  var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
  return fetch(API + "?" + q).then(function (r) { return r.json(); });
}
function saveSess() { try { sessionStorage.setItem("dh_client", JSON.stringify(st.sess)); } catch (e) {} }
function logout() { st.sess = null; st.renewing = null; try { sessionStorage.removeItem("dh_client"); } catch (e) {} render(); }

function render() {
  if (!root()) return;
  if (!st.sess) return loginView();
  if (st.renewing) return renewView();
  return dashView();
}

function loginView(msg) {
  root().innerHTML =
    '<div class="card" style="max-width:420px;margin:0 auto"><h2>আমার অ্যাকাউন্ট</h2>' +
    '<p class="sub">ফোন নম্বর ও PIN দিয়ে লগইন করুন।</p>' +
    '<form id="loginForm" novalidate><div class="fields">' +
    '<label class="full">মোবাইল নম্বর<input id="l-phone" inputmode="tel" placeholder="01XXXXXXXXX"></label>' +
    '<label class="full">PIN<input id="l-pin" type="password" inputmode="numeric"></label></div>' +
    '<p class="err" id="l-err" role="alert">' + esc(msg || "") + '</p>' +
    '<div class="actions"><button class="btn" type="submit">লগইন</button></div></form></div>';
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var phone = document.getElementById("l-phone").value.trim(), pin = document.getElementById("l-pin").value.trim();
    var errEl = document.getElementById("l-err"), btn = e.target.querySelector("button");
    btn.disabled = true;
    api({action: "login", phone: phone, pin: pin}).then(function (j) {
      btn.disabled = false;
      if (j.error) { errEl.textContent = "ফোন বা PIN ভুল।"; return; }
      st.sess = {phone: phone, pin: pin, name: j.name, services: j.services}; saveSess(); render();
    }).catch(function () {
      btn.disabled = false; errEl.textContent = "সংযোগে সমস্যা, আবার চেষ্টা করুন।";
    });
  });
}

function refresh() {
  return api({action: "login", phone: st.sess.phone, pin: st.sess.pin}).then(function (j) {
    if (isBadLogin(j)) { logout(); return; }
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
      if (isBadLogin(j)) { logout(); return; }
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

window.ClientArea = {render: render};

/* পাতা সরাসরি #/client দিয়ে খুললে */
if (location.hash.indexOf("#/client") === 0) render();
})();
