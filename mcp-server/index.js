const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { z } = require('zod');

const app = express();
const PORT = process.env.PORT || 3000;

// MCP 工具定义
const tools = [
  {
    name: 'echo',
    description: '回显用户输入的消息',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '要回显的消息'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'get_current_time',
    description: '获取当前时间',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// 创建 MCP Server
const server = new Server(
  {
    name: 'cloudbase-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'echo') {
      const message = args.message;
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${message}`
          }
        ]
      };
    }

    if (name === 'get_current_time') {
      const now = new Date();
      return {
        content: [
          {
            type: 'text',
            text: `当前时间: ${now.toISOString()}`
          }
        ]
      };
    }

    throw new Error(`未知工具: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// 用于存储 SSE 传输实例
let transport = null;

// SSE 端点
app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

// 消息处理端点
app.post('/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: 'No active SSE connection' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'CloudBase MCP Server',
    version: '1.0.0',
    endpoints: {
      sse: '/sse',
      messages: '/messages',
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
