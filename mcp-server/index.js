const { functionFramework } = require('@cloudbase/functions-framework');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

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

// 存储 SSE 传输实例
const transports = new Map();

// 注册 SSE 端点
functionFramework.http('sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);
  await server.connect(transport);
});

// 注册消息处理端点
functionFramework.http('messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: 'No active SSE connection' });
  }
});

// 健康检查
functionFramework.http('health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径
functionFramework.http('main', async (req, res) => {
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
