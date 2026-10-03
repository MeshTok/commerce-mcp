'use strict';
// Optional streamable-HTTP mode: node src/http.js [port]  (default 3300)
// POST /mcp  with JSON-RPC body → single JSON response (stateless)
const http = require('http');
const engine = require('./engine');

const TOOLS = require('./tools.json');
function handleTool(name, args) {
  const map = {
    search_products: engine.searchProducts, get_product: engine.getProduct,
    create_order: engine.createOrder, pay_order: engine.payOrder,
    get_order: engine.getOrder, list_orders: engine.listOrders, request_refund: engine.requestRefund
  };
  const h = map[name];
  if (!h) throw new Error('unknown tool: ' + name);
  return h(args || {});
}
http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/mcp')) { res.writeHead(404).end(); return; }
  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', () => {
    let msg; try { msg = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
    const id = msg.id !== undefined ? msg.id : null;
    try {
      if (msg.method === 'initialize') return json({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'commerce-mcp-sandbox', version: '0.1.0' } });
      if (msg.method === 'tools/list') return json({ tools: TOOLS });
      if (msg.method === 'tools/call') {
        const data = handleTool(msg.params.name, msg.params.arguments);
        return json({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: !!data.error });
      }
      if (msg.method === 'ping') return json({});
      return jsonErr(-32601, 'method not found');
    } catch (e) { return jsonErr(-32603, e.message); }
    function json(result) { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id, result })); }
    function jsonErr(code, message) { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })); }
  });
}).listen(parseInt(process.argv[2] || '3300', 10), () => console.log('[commerce-mcp-sandbox] http://0.0.0.0:' + (process.argv[2] || '3300') + '/mcp'));
