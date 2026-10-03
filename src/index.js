#!/usr/bin/env node
'use strict';
// commerce-mcp-sandbox — stdio MCP server (JSON-RPC 2.0, zero dependencies)
const engine = require('./engine');

const TOOLS = [
  { name: 'search_products', description: 'Search the mock catalog. Prices in CNY cents (int). Read-only.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string', enum: ['daily', 'office', 'digital', 'food', 'pet'] }, page: { type: 'number' }, page_size: { type: 'number' } } } },
  { name: 'get_product', description: 'Product detail by sku, incl. specs. Read-only.',
    inputSchema: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] } },
  { name: 'create_order', description: 'Create an order. Requires receiver {name, phone, address}. Idempotency is the caller\'s job in this sandbox (orders are in-memory).',
    inputSchema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { sku: { type: 'string' }, qty: { type: 'number' } }, required: ['sku'] } }, receiver: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' } }, required: ['name', 'phone', 'address'] }, user_ref: { type: 'string' } }, required: ['items', 'receiver'] } },
  { name: 'pay_order', description: 'Simulate a successful payment for an order. Shipping auto-advances (~5s) and delivery (~15s) so agents can exercise full flows.',
    inputSchema: { type: 'object', properties: { order_no: { type: 'string' } }, required: ['order_no'] } },
  { name: 'get_order', description: 'Order status + event timeline (created/paid/shipped/delivered/refunded).',
    inputSchema: { type: 'object', properties: { order_no: { type: 'string' } }, required: ['order_no'] } },
  { name: 'list_orders', description: 'List orders, optionally filtered by user_ref.',
    inputSchema: { type: 'object', properties: { user_ref: { type: 'string' } } } },
  { name: 'request_refund', description: 'Simulate a refund for a paid/shipped/completed order (no real money).',
    inputSchema: { type: 'object', properties: { order_no: { type: 'string' }, reason: { type: 'string' } }, required: ['order_no'] } }
];

const HANDLERS = {
  search_products: engine.searchProducts,
  get_product: engine.getProduct,
  create_order: engine.createOrder,
  pay_order: engine.payOrder,
  get_order: engine.getOrder,
  list_orders: engine.listOrders,
  request_refund: engine.requestRefund
};

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function replyErr(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
function handle(msg) {
  const id = msg.id !== undefined ? msg.id : null;
  try {
    if (msg.method === 'initialize') {
      return reply(id, { protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-06-18',
        capabilities: { tools: {} }, serverInfo: { name: 'commerce-mcp-sandbox', version: '0.1.0', title: 'Commerce Sandbox (mock)' } });
    }
    if (msg.method === 'notifications/initialized') return;
    if (msg.method === 'tools/list') return reply(id, { tools: TOOLS });
    if (msg.method === 'ping') return reply(id, {});
    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      const h = HANDLERS[name];
      if (!h) return replyErr(id, -32602, 'unknown tool: ' + name);
      const data = h(args || {});
      return reply(id, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: !!data.error });
    }
    return replyErr(id, -32601, 'method not found: ' + (msg.method || ''));
  } catch (e) {
    return replyErr(id, -32603, e.message);
  }
}
process.on('connect', () => {});
console.error('[commerce-mcp-sandbox] stdio ready — mock data only, no real goods/payments');
