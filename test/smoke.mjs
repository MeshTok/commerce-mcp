// smoke test: node test/smoke.mjs  (spawn stdio server, drive a full shopping flow)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const proc = spawn(process.execPath, [path.join(dir, 'src/index.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = ''; const pending = new Map(); let idc = 0;
proc.stdout.setEncoding('utf8');
proc.stdout.on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
const rpc = (method, params) => new Promise((res) => {
  const id = ++idc; pending.set(id, res);
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});
const call = async (tool, args) => (await rpc('tools/call', { name: tool, arguments: args })).result;

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ok -', name); } else { fail++; console.log('  FAIL -', name); } };

const init = await rpc('initialize', { protocolVersion: '2025-06-18' });
ok(init.result.serverInfo.name === 'commerce-mcp-sandbox', 'initialize');
const tl = await rpc('tools/list', {});
ok(tl.result.tools.length === 7, 'tools/list has 7 tools');
const s = await call('search_products', { query: 'umbrella' });
ok(s.structuredContent.items.length === 1, 'search finds umbrella');
const d = await call('get_product', { sku: 'THM-002' });
ok(d.structuredContent.price === 6900, 'get_product price');
const o = await call('create_order', { items: [{ sku: 'THM-002', qty: 1 }], receiver: { name: 'T', phone: '13800000000', address: 'Test Rd 1' } });
ok(!!o.structuredContent.order_no, 'create_order');
const bad = await rpc('tools/call', { name: 'create_order', arguments: { items: [{ sku: 'NOPE', qty: 1 }], receiver: { name: 'T', phone: '1', address: 'x' } } });
ok(bad.result.isError === true && bad.result.structuredContent.error === 'NOT_FOUND', 'unknown sku rejected');
const p = await call('pay_order', { order_no: o.structuredContent.order_no });
ok(p.structuredContent.status === 'paid', 'pay_order');
await new Promise(res => setTimeout(res, 6000));
const st = await call('get_order', { order_no: o.structuredContent.order_no });
ok(st.structuredContent.status === 'shipped' && st.structuredContent.waybill, 'auto-advance to shipped');
const rf = await call('request_refund', { order_no: o.structuredContent.order_no, reason: 'test' });
ok(rf.structuredContent.refund.status.includes('refunded'), 'refund simulated');
console.log(`\n${pass} passed, ${fail} failed`);
proc.kill();
process.exit(fail ? 1 : 0);
