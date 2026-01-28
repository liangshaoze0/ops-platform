# DevOps自动化运维平台 - 前端

基于React + Vite开发的现代化前端应用，提供GitHub OAuth登录和AI背景图生成功能。

## 功能特性

- ✅ GitHub OAuth登录
- ✅ 用户信息展示
- ✅ AI背景图生成界面
- ✅ 动态背景图展示
- ✅ 响应式设计
- ✅ 现代化UI/UX

## 技术栈

- **框架**: React 18
- **构建工具**: Vite
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **样式**: CSS3 (动画、渐变、响应式)

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 3. 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录。

### 4. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── components/          # 组件
│   │   ├── BackgroundDisplay.jsx    # 背景图展示
│   │   ├── BackgroundGenerator.jsx  # 背景图生成器
│   │   ├── ProtectedRoute.jsx       # 路由保护
│   │   └── UserProfile.jsx          # 用户资料
│   ├── contexts/            # Context API
│   │   └── AuthContext.jsx  # 认证上下文
│   ├── pages/               # 页面
│   │   ├── Login.jsx        # 登录页
│   │   └── Dashboard.jsx    # 主面板
│   ├── services/            # 服务
│   │   └── api.js          # API客户端
│   ├── App.jsx             # 根组件
│   ├── main.jsx            # 入口文件
│   └── index.css           # 全局样式
├── index.html              # HTML模板
├── package.json            # 依赖配置
└── vite.config.js          # Vite配置
```

## 页面说明

### 登录页 (`/login`)

- GitHub OAuth登录按钮
- 动态渐变背景
- 现代化卡片设计

### 主面板 (`/dashboard`)

- 用户信息展示
- AI背景图生成器
- 动态背景图展示

## API集成

前端通过代理连接到后端API：

- 开发环境：通过Vite代理 (`/api` → `http://localhost:8080/api`)
- 生产环境：需要配置反向代理或CORS

## 环境变量

可以在 `vite.config.js` 中配置：

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

## 特性说明

### 动态背景图

- 支持全屏背景展示
- 平滑加载动画
- 响应式适配

### 背景图生成

- 预设尺寸快速选择
- 自定义宽高
- 可选描述提示词
- 实时生成状态反馈

### 用户认证

- JWT Token管理
- 自动刷新用户信息
- 登出功能

## 浏览器支持

- Chrome (最新)
- Firefox (最新)
- Safari (最新)
- Edge (最新)

## 开发说明

### 添加新页面

1. 在 `src/pages/` 创建组件
2. 在 `App.jsx` 添加路由
3. 如需保护，使用 `ProtectedRoute`

### 添加新API

在 `src/services/api.js` 中添加方法，或直接使用：

```javascript
import api from './services/api'

// GET请求
const response = await api.get('/endpoint')

// POST请求
const response = await api.post('/endpoint', data)
```

## 部署

### 构建

```bash
npm run build
```

### 部署到Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 许可证

MIT License
