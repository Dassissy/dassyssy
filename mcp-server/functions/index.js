const { FunctionServer, createServer } = require('@cloudbase/functions-framework');

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

// 主函数 - 处理根路径
exports.main = createServer((req, res) => {
  res.json({
    name: 'CloudBase MCP Server',
    version: '1.0.0',
    endpoints: {
      tools: '/tools',
      health: '/health'
    }
  });
});

// 健康检查
exports.health = createServer((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 工具列表
exports.tools = createServer((req, res) => {
  res.json({ tools });
});

// MCP 调用端点
exports.call = createServer(async (req, res) => {
  const { name, arguments: args } = req.body || {};

  try {
    if (name === 'echo') {
      const message = args?.message || '';
      res.json({
        content: [
          {
            type: 'text',
            text: `Echo: ${message}`
          }
        ]
      });
      return;
    }

    if (name === 'get_current_time') {
      const now = new Date();
      res.json({
        content: [
          {
            type: 'text',
            text: `当前时间: ${now.toISOString()}`
          }
        ]
      });
      return;
    }

    res.status(400).json({ error: `未知工具: ${name}` });
  } catch (error) {
    res.status(500).json({
      content: [
        {
          type: 'text',
          text: `错误: ${error.message}`
        }
      ],
      isError: true
    });
  }
});
