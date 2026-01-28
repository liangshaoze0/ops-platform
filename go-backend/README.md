# DevOps自动化运维平台 - Go后端

基于Go语言开发的运维自动化平台后端，支持GitHub OAuth登录和AI图片动态效果背景图生成。

## 功能特性

- ✅ GitHub OAuth登录认证
- ✅ JWT Token会话管理
- ✅ AI动态效果背景图生成
- ✅ MySQL数据库集成
- ✅ RESTful API设计

## 技术栈

- **框架**: Gin
- **数据库**: MySQL + GORM
- **认证**: GitHub OAuth2 + JWT
- **图片生成**: 自定义算法（渐变、粒子、波纹、光晕效果）

## 快速开始

### 1. 环境要求

- Go 1.21+
- MySQL 5.7+
- GitHub OAuth App

### 2. 安装依赖

```bash
cd go-backend
go mod download
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

主要配置项：
- `DB_*`: MySQL数据库配置
- `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret
- `JWT_SECRET`: JWT签名密钥（生产环境请使用强密钥）

### 4. 创建GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: DevOps Platform
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:8080/api/auth/github/callback
4. 获取 Client ID 和 Client Secret，填入 `.env` 文件

### 5. 创建数据库

```sql
CREATE DATABASE devops_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. 运行服务

```bash
go run main.go
```

服务将在 `http://localhost:8080` 启动。

## API文档

### 认证接口

#### GitHub登录
```
GET /api/auth/github
```
重定向到GitHub授权页面

#### GitHub回调
```
GET /api/auth/github/callback?code=xxx
```
GitHub OAuth回调，返回token到前端

#### 获取当前用户
```
GET /api/user
Authorization: Bearer <token>
```

#### 登出
```
POST /api/logout
Authorization: Bearer <token>
```

### AI图片接口

#### 生成背景图
```
POST /api/ai/background
Authorization: Bearer <token>
Content-Type: application/json

{
  "width": 1920,
  "height": 1080,
  "prompt": "科技感蓝色渐变"
}
```

#### 获取用户图片列表
```
GET /api/ai/images
Authorization: Bearer <token>
```

#### 获取激活的背景图
```
GET /api/ai/background/active
Authorization: Bearer <token>
```

## 项目结构

```
go-backend/
├── main.go                 # 入口文件
├── go.mod                  # Go模块定义
├── .env.example            # 环境变量示例
├── internal/
│   ├── config/             # 配置管理
│   ├── handlers/           # 请求处理器
│   │   ├── auth.go         # 认证处理器
│   │   └── ai_image.go     # AI图片处理器
│   ├── middleware/         # 中间件
│   │   └── auth.go         # 认证中间件
│   ├── models/             # 数据模型
│   │   └── user.go         # 用户模型
│   ├── routes/             # 路由配置
│   │   └── auth.go         # 路由设置
│   └── utils/              # 工具函数
│       ├── jwt.go          # JWT工具
│       └── response.go     # 响应工具
└── pkg/
    └── database/           # 数据库连接
        └── database.go
```

## AI图片生成算法

背景图生成使用以下效果组合：

1. **径向渐变**: 从中心向外的颜色渐变
2. **粒子效果**: 随机分布的亮点粒子
3. **波纹效果**: 同心圆波纹扩散
4. **光晕效果**: 柔和的光晕叠加

所有效果基于数学算法生成，无需外部AI服务，性能优异。

## 开发说明

### 数据库迁移

使用GORM的AutoMigrate自动创建表结构，首次运行会自动创建以下表：
- `users`: 用户表
- `sessions`: 会话表
- `ai_images`: AI图片表

### 扩展功能

- 可以集成真实的AI图片生成API（如Stable Diffusion、DALL-E等）
- 可以添加更多图片效果和滤镜
- 可以支持图片上传和存储到对象存储

## 许可证

MIT License
