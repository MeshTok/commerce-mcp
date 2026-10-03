# commerce-mcp-sandbox

**A zero-dependency mock commerce MCP server for building and testing shopping agents.**

给购物类 AI agent 用的模拟商城后端：搜索、下单、模拟支付、物流自动推进、退款——全部内存模拟，**没有任何真实商品与真实资金**。让你在写购物 agent 时不用等真实电商接口，先把 agent 逻辑跑通。

English below | 中文说明见下半部分

---

## Why

Every developer building a shopping agent hits the same wall: *"I need a commerce backend to test against."* Real APIs need credentials, contracts, and money. This sandbox gives you the full shopping lifecycle — search → order → pay → ship → deliver → refund — as an MCP server your agent can talk to, with deterministic in-memory state.

## Install & Run

Zero dependencies. Node ≥ 18.

```bash
npx commerce-mcp-sandbox          # stdio mode (for MCP hosts)
npx commerce-mcp-sandbox --http   # not supported yet; use node src/http.js 3300
# or clone & run:
node src/index.js                 # stdio
node src/http.js 3300             # HTTP mode: POST http://localhost:3300/mcp
```

### MCP host configuration

```json
{
  "mcpServers": {
    "commerce-sandbox": {
      "command": "npx",
      "args": ["commerce-mcp-sandbox"]
    }
  }
}
```

Streamable-HTTP hosts (Dify / Coze / web agents):

```
url: http://localhost:3300/mcp
```

## Tools (7)

| tool | 说明 |
|---|---|
| `search_products` | Search mock catalog (query/category/page). Prices in CNY cents. |
| `get_product` | Product detail with specs. |
| `create_order` | Create order. Requires `receiver {name, phone, address}`. |
| `pay_order` | **Simulate** payment. Shipping auto-advances in ~5s, delivery in ~15s — so agents can exercise the full lifecycle in seconds. |
| `get_order` | Status + event timeline (`created/paid/shipped/delivered/refunded`). |
| `list_orders` | List orders, filter by `user_ref`. |
| `request_refund` | Simulate refund (no real money). |

## Example flow

```
agent: search_products {query: "umbrella"}     → 1 item, ¥39.00
agent: create_order {items:[{sku:"UMB-001",qty:1}], receiver:{...}}
user:  pay_order {order_no:"MOCK100001"}       → paid
(wait ~5s) get_order → shipped (waybill SF...)
(wait ~15s) get_order → completed
agent: request_refund {order_no:"MOCK100001"}  → refunded (simulated)
```

## Honest limits

- **In-memory only** — restart wipes state. This is a test double, not a store.
- **No real payments** — `pay_order` flips state; nothing is charged.
- **Single-instance** — no persistence layer by design.

## Building a real shopping agent?

This sandbox is built by [源头淘 (Yuantoutao)](https://yuantoutao.com) — an open product shelf + fulfillment network for AI agents in China (MCP + REST, WeChat Pay checkout, merchant drop-shipping via ERP, automated aftersales). When your agent is ready for real goods: **same tool surface, swap the endpoint, done.**

Docs: https://mcp.yuantoutao.com/docs/ · llms.txt: https://mcp.yuantoutao.com/llms.txt

## License

MIT
