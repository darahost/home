const P = PropertiesService.getScriptProperties();
const SHEET_ID = () => P.getProperty('SHEET_ID');
const SECRET = () => P.getProperty('SECRET');

function doGet(e) {
  const a = e.parameter.action || '';
  let out;
  try {
    if (a === 'login') out = login(e.parameter.phone, e.parameter.pin);
    else if (a === 'renew') out = requestRenewal(e.parameter);
    else out = { error: 'unknown_action' };
  } catch (err) {
    out = { error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss() { return SpreadsheetApp.openById(SHEET_ID()); }

function rows(name) {
  const v = ss().getSheetByName(name).getDataRange().getValues();
  const h = v.shift();
  return v.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}

function normPhone(s) {
  s = String(s || '').replace(/\D/g, '');
  if (s.startsWith('880')) s = s.slice(3);
  if (/^1\d{9}$/.test(s)) s = '0' + s;
  return s;
}

function sha(s) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SECRET() + s));
}

function authCustomer(phone, pin) {
  const p = normPhone(phone);
  const c = rows('Customers').find(r => normPhone(r.phone) === p);
  if (!c || c.pin_hash !== sha(String(pin || ''))) throw new Error('bad_login');
  return { phone: p, name: c.name };
}

function svc(r) {
  const days = Math.ceil((new Date(r.expiry) - new Date()) / 86400000);
  return {
    id: r.service_id, type: r.type, name: r.name, plan: r.plan_id, cycle: r.cycle,
    expiry: r.expiry, days,
    status: days < 0 ? 'expired' : (days <= 30 ? 'soon' : 'active'),
    renew_price: r.renew_price, renew_months: r.renew_months
  };
}

function login(phone, pin) {
  const c = authCustomer(phone, pin);
  const services = rows('Services')
    .filter(r => normPhone(r.customer_phone) === c.phone)
    .map(svc);
  return { name: c.name, services };
}

function requestRenewal(p) {
  const c = authCustomer(p.phone, p.pin);
  const s = rows('Services').find(r =>
    r.service_id === p.service_id && normPhone(r.customer_phone) === c.phone);
  if (!s) return { error: 'not_found' };
  const trx = String(p.trx || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z0-9]{8,12}$/.test(trx)) return { error: 'bad_trx' };
  if (rows('Orders').some(o => String(o.trx) === trx)) return { error: 'dup_trx' };
  const id = 'RN' + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyMMddHHmmss') + '-' + trx.slice(-4);
  ss().getSheetByName('Orders').appendRow([
    id, new Date(), c.phone, s.service_id, 'renew', s.renew_price,
    String(p.method || ''), normPhone(p.sender), trx, 'verifying'
  ]);
  return { order_id: id, amount: s.renew_price };
}

// Orders-এর status কলামে "confirmed" লিখলে মেয়াদ বাড়ে
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== 'Orders' || e.range.getColumn() !== 10) return;
  if (e.value !== 'confirmed') return;
  const row = sh.getRange(e.range.getRow(), 1, 1, 10).getValues()[0];
  if (row[4] !== 'renew') return;
  const svcSh = ss().getSheetByName('Services');
  const data = svcSh.getDataRange().getValues();
  const h = data[0];
  const idC = h.indexOf('service_id'), expC = h.indexOf('expiry'),
        monC = h.indexOf('renew_months'), stC = h.indexOf('status');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idC] === row[3]) {
      const base = Math.max(new Date(data[i][expC]).getTime(), Date.now());
      const d = new Date(base);
      d.setMonth(d.getMonth() + Number(data[i][monC]));
      svcSh.getRange(i + 1, expC + 1).setValue(d);
      svcSh.getRange(i + 1, stC + 1).setValue('active');
      break;
    }
  }
}

// একবার এডিটর থেকে চালান: setPin('01XXXXXXXXX', '1234')
function setPin(phone, pin) {
  const sh = ss().getSheetByName('Customers');
  const d = sh.getDataRange().getValues();
  const h = d[0];
  for (let i = 1; i < d.length; i++) {
    if (normPhone(d[i][h.indexOf('phone')]) === normPhone(phone)) {
      sh.getRange(i + 1, h.indexOf('pin_hash') + 1).setValue(sha(String(pin)));
      return 'ok';
    }
  }
  return 'not found';
}
