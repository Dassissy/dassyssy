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

// 主处理函数
module.exports = async (req, res) => {
  const { path } = req;

  // SSE 端点
  if (path === '/sse' || path === '/sse/') {
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);
    
    res.on('close', () => {
      transports.delete(sessionId);
    });
    
    await server.connect(transport);
    return;
  }

  // 消息处理端点
  if (path === '/messages' || path.startsWith('/messages')) {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: 'No active SSE connection' });
    }
    return;
  }

  // 健康检查
  if (path === '/health' || path === '/health/') {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // 根路径 - 返回服务信息
  res.json({
    name: 'CloudBase MCP Server',
    version: '1.0.0',
    endpoints: {
      sse: '/sse',
      messages: '/messages',
      health: '/health'
    }
  });
};
