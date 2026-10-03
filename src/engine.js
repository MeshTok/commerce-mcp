'use strict';
// In-memory mock commerce catalog + order engine (generic goods, zero real supply)
const CATALOG = [
  { sku: 'UMB-001', title: 'Compact Folding Umbrella', titleZh: '折叠晴雨伞', price: 3900, currency: 'CNY', category: 'daily',
    specs: { weight_g: 320, open_type: 'manual', uv_coating: true }, stock: 120,
    desc: 'Folding umbrella, 190T fabric, UV coating; fits a backpack. Not for storm-force wind.' },
  { sku: 'THM-002', title: 'Stainless Vacuum Bottle 500ml', titleZh: '不锈钢保温杯 500ml', price: 6900, currency: 'CNY', category: 'daily',
    specs: { capacity_ml: 500, material: '316 stainless', heat_retention_h: 6 }, stock: 80,
    desc: '316 stainless vacuum bottle, 6h heat retention; hand-wash only.' },
  { sku: 'NBK-003', title: 'A5 Dotted Notebook (3-pack)', titleZh: 'A5 点阵笔记本三本装', price: 4500, currency: 'CNY', category: 'office',
    specs: { pages: 160, size: 'A5', pack: 3 }, stock: 200,
    desc: 'A5 dotted notebooks, 160 pages each, pack of 3; ink-friendly 100gsm paper.' },
  { sku: 'CBL-004', title: 'USB-C Cable 1m (braided)', titleZh: '编织 Type-C 数据线 1m', price: 2900, currency: 'CNY', category: 'digital',
    specs: { length_m: 1, current_max: '3A', braided: true }, stock: 300,
    desc: 'Braided USB-C to USB-C cable, 3A charging / 480Mbps data; not Thunderbolt.' },
  { sku: 'SNK-005', title: 'Mixed Nuts Daily Pack (30)', titleZh: '每日坚果混合装 30 包', price: 12900, currency: 'CNY', category: 'food',
    specs: { packs: 30, weight_g: 25 }, stock: 60,
    desc: 'Daily nut packs, 25g x 30; contains tree nuts and peanuts. Shelf life 8 months.' },
  { sku: 'PET-006', title: 'Freeze-dried Chicken Dog Treats', titleZh: '冻干鸡肉粒 犬用', price: 5900, currency: 'CNY', category: 'pet',
    specs: { weight_g: 100, ingredient: 'chicken breast' }, stock: 90,
    desc: 'Single-ingredient freeze-dried chicken treats for dogs, 100g; resealable bag.' },
  { sku: 'DSK-007', title: 'Aluminium Phone Stand', titleZh: '铝合金手机支架', price: 3500, currency: 'CNY', category: 'digital',
    specs: { material: 'aluminium', adjustable: true }, stock: 150,
    desc: 'Adjustable aluminium desk stand for phones/tablets up to 12-inch.' },
  { sku: 'TOW-008', title: 'Compressed Towels (20-pack)', titleZh: '一次性压缩毛巾 20 粒', price: 2500, currency: 'CNY', category: 'daily',
    specs: { count: 20, size_expanded_cm: '30x60' }, stock: 250,
    desc: 'Compressed cotton towels, expand to 30x60cm with water; single-use.' }
];

const ORDERS = new Map();
const REFUNDS = new Map();
let seq = 100000;
const now = () => new Date().toISOString();
const payOf = (items) => items.reduce((s, i) => s + i.unit_price * i.qty, 0);

function searchProducts({ query, category, page = 1, page_size = 10 }) {
  let items = CATALOG.filter(p => p.stock > 0);
  if (query) {
    const q = String(query).toLowerCase();
    items = items.filter(p => (p.title + p.titleZh + p.desc).toLowerCase().includes(q));
  }
  if (category) items = items.filter(p => p.category === category);
  const size = Math.min(page_size || 10, 50);
  const slice = items.slice((page - 1) * size, (page - 1) * size + size);
  return {
    total: items.length, page,
    items: slice.map(p => ({ sku: p.sku, title: p.title, title_zh: p.titleZh, price: p.price, currency: p.currency,
      stock: p.stock, category: p.category }))
  };
}
function getProduct({ sku }) {
  const p = CATALOG.find(x => x.sku === sku);
  if (!p) return { error: 'NOT_FOUND', message: 'unknown sku' };
  return { sku: p.sku, title: p.title, title_zh: p.titleZh, price: p.price, currency: p.currency,
    stock: p.stock, category: p.category, specs: p.specs, description: p.desc };
}
function createOrder({ items, receiver, user_ref }) {
  if (!Array.isArray(items) || !items.length) return { error: 'INVALID_PARAM', message: 'items required' };
  if (!receiver || !receiver.name || !receiver.phone || !receiver.address) {
    return { error: 'INVALID_PARAM', message: 'receiver requires name/phone/address' };
  }
  const norm = [];
  for (const it of items) {
    const p = CATALOG.find(x => x.sku === it.sku);
    if (!p) return { error: 'NOT_FOUND', message: 'unknown sku ' + it.sku };
    const qty = Math.max(1, Math.min(parseInt(it.qty || 1, 10), 99));
    if (p.stock < qty) return { error: 'OUT_OF_STOCK', message: p.sku + ' stock ' + p.stock };
    norm.push({ sku: p.sku, title: p.title, qty, unit_price: p.price });
  }
  const no = 'MOCK' + (++seq);
  const order = {
    order_no: no, status: 'created', items: norm, total: payOf(norm), currency: 'CNY',
    receiver, user_ref: user_ref || null, created_at: now(),
    events: [{ event: 'created', at: now() }]
  };
  ORDERS.set(no, order);
  return { order_no: no, status: 'created', amount: order.total, currency: 'CNY',
    pay_hint: 'sandbox: call pay_order to simulate a successful payment', expire_in_minutes: 30 };
}
function payOrder({ order_no }) {
  const o = ORDERS.get(order_no);
  if (!o) return { error: 'NOT_FOUND', message: 'unknown order' };
  if (o.status !== 'created') return { error: 'INVALID_STATE', message: 'status=' + o.status };
  o.status = 'paid'; o.events.push({ event: 'paid', at: now() });
  // sandbox logistics auto-advance
  setTimeout(() => { o.status = 'shipped'; o.waybill = 'SF' + Date.now();
    o.events.push({ event: 'shipped', at: now(), payload: { waybill_no: o.waybill, express_co: 'SANDBOX' } }); }, 5000);
  setTimeout(() => { if (o.status === 'shipped') { o.status = 'completed';
    o.events.push({ event: 'delivered', at: now() }); } }, 15000);
  return { order_no: no2(o), status: o.status, message: 'payment simulated; shipping auto-advances in ~5s, delivery in ~15s' };
}
function no2(o) { return o.order_no; }
function getOrder({ order_no }) {
  const o = ORDERS.get(order_no);
  if (!o) return { error: 'NOT_FOUND', message: 'unknown order' };
  return { order_no: o.order_no, status: o.status, total: o.total, currency: o.currency,
    items: o.items, events: o.events, waybill: o.waybill || null, refunds: REFUNDS.get(order_no) || [] };
}
function requestRefund({ order_no, reason }) {
  const o = ORDERS.get(order_no);
  if (!o) return { error: 'NOT_FOUND', message: 'unknown order' };
  if (!['paid', 'shipped', 'completed'].includes(o.status)) {
    return { error: 'INVALID_STATE', message: 'status=' + o.status + ' not refundable' };
  }
  o.status = 'refunded'; o.events.push({ event: 'refunded', at: now(), payload: { reason: reason || '' } });
  const rec = { order_no: o.order_no, amount: o.total, status: 'refunded (simulated)', reason: reason || '' };
  REFUNDS.set(order_no, [...(REFUNDS.get(order_no) || []), rec]);
  return { order_no: o.order_no, refund: rec, message: 'refund simulated (sandbox — no real money moved)' };
}
function listOrders({ user_ref }) {
  const all = [...ORDERS.values()].filter(o => !user_ref || o.user_ref === user_ref);
  return { count: all.length, orders: all.map(o => ({ order_no: o.order_no, status: o.status, total: o.total, user_ref: o.user_ref })) };
}

module.exports = { searchProducts, getProduct, createOrder, payOrder, getOrder, requestRefund, listOrders, CATALOG };
