// MCP host 配置示例（复制到你的宿主配置里即可）
// Claude Desktop / ZCode / Cherry Studio 等stdio宿主：
const STDIO_CONFIG = {
  mcpServers: {
    'commerce-sandbox': {
      command: 'npx',
      args: ['commerce-mcp-sandbox']
    }
  }
};

// Streamable-HTTP 宿主（Dify / Coze / 自研 web agent）：
//   先起服务：npx commerce-mcp-sandbox --http 不支持时用 node src/http.js 3300
const HTTP_CONFIG = {
  mcpServers: {
    'commerce-sandbox': {
      type: 'url',
      url: 'http://localhost:3300/mcp'
    }
  }
};

module.exports = { STDIO_CONFIG, HTTP_CONFIG };
