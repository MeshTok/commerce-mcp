# 我开源了一个"假商城"：给购物 Agent 当测试后端

> 项目地址：[github.com/MeshTok/commerce-mcp](https://github.com/MeshTok/commerce-mcp) · 零依赖 · MIT · `npx commerce-mcp-sandbox` 直接跑

## 起因

最近在做一个能帮用户下单的 AI agent，很快撞上所有购物 agent 开发者都会撞的墙：

**我需要一个商城后端来测试。**

真实电商接口要资质、要签约、要花钱；自己 mock 又要造商品数据、订单状态机、支付模拟、物流推进——这些脏活和我的 agent 逻辑毫无关系，但没有它，agent 的下单链路根本测不了。

所以我把它做成了一个开源的 MCP server：**commerce-mcp-sandbox**。一个内存里的假商城，专门给购物 agent 当测试后端。

## 它提供什么

7 个 MCP 工具，覆盖完整购物生命周期：

```
search_products → get_product → create_order → pay_order
                                     ↓ (5秒后自动发货)
              request_refund ← get_order ← (15秒后自动签收)
```

- 商品目录内置 8 个 SKU（伞/保温杯/数据线/坚果/宠物冻干……中英双语）
- `pay_order` 是模拟支付，但支付后**发货和签收会自动推进**——你的 agent 能在十几秒内跑完真实世界要两天的状态流转
- 错误契约和真实电商一致：`OUT_OF_STOCK`、`NOT_FOUND`、幂等下单……边界情况提前测

## 30 秒上手

```bash
npx commerce-mcp-sandbox        # stdio，挂进任何 MCP 宿主
node src/http.js 3300           # 或 HTTP 模式：POST localhost:3300/mcp
```

Claude Desktop / ZCode 配置：

```json
{
  "mcpServers": {
    "commerce-sandbox": { "command": "npx", "args": ["commerce-mcp-sandbox"] }
  }
}
```

然后就可以对 agent 说："帮我买把伞"——看它搜品、算价、下单、等你"付款"、播报物流。**全程没有一分钱真实资金。**

## 设计取舍（诚实版）

- **内存存储，重启清零**——它是测试替身不是商店，刻意不做持久化
- **支付纯模拟**——`pay_order` 只翻转状态，一分钱不动
- **零依赖**——纯 Node 原生，`npm install` 都不用，这也是它能 `npx` 直跑的原因
- **单实例**——没有分布式语义，别拿它压测

## 技术实现要点

给想抄实现的同学划三个重点（全部在 500 行以内）：

1. **MCP stdio 传输**：JSON-RPC 2.0 按行读写 stdin/stdout，`initialize → tools/list → tools/call` 三个方法就能被任何宿主识别
2. **状态机显式迁移**：订单只允许 `created→paid→shipped→completed` 这样的合法迁移，非法迁移直接抛错——agent 乱序调用时错误信息清晰
3. **时间推进用 `setTimeout`**：模拟"真实世界的时间流逝"，让 agent 的轮询逻辑真实地被锻炼到

## 和真实货源的关系

这个沙箱是 [源头淘](https://yuantoutao.com) 开源的。源头淘做的是给 AI agent 用的商品货架：你的购物 agent 开发完，换一个 MCP 端点地址 + 一个 API key，就能接到真实货源（产业带商家一件代发、微信支付、自动售后），**工具签名完全一致，agent 代码零改动**。

开发者接入文档：[mcp.yuantoutao.com/docs](https://mcp.yuantoutao.com/docs/)（含"50 行代码做一个购物 agent"完整教程）

## 一句话

购物 agent 的开发瓶颈从来不是模型，是**没有一个可以随便折腾的商城**。现在有了。

> 觉得有用的话去 GitHub 点个 star：[MeshTok/commerce-mcp](https://github.com/MeshTok/commerce-mcp) · 问题反馈走 issue
