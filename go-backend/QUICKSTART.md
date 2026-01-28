# 快速启动指南

## 1. 准备工作

### 安装Go
确保已安装Go 1.21或更高版本：
```bash
go version
```

### 安装MySQL
确保MySQL 5.7+已安装并运行。

### 创建GitHub OAuth App
1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - **Application name**: DevOps Platform
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:8080/api/auth/github/callback
4. 点击 "Register application"
5. 复制 **Client ID** 和 **Client Secret**

## 2. 配置环境

### 复制环境变量文件
```bash
cp env.example .env
```

### 编辑 .env 文件
填写以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=devops_platform

# GitHub OAuth配置
GITHUB_CLIENT_ID=你的GitHub_Client_ID
GITHUB_CLIENT_SECRET=你的GitHub_Client_Secret

# JWT密钥（生产环境请使用强密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 3. 创建数据库

登录MySQL并执行：
```sql
CREATE DATABASE devops_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

或者使用提供的SQL脚本：
```bash
mysql -u root -p < database/init.sql
```

## 4. 安装依赖

```bash
go mod download
```

## 5. 运行服务

```bash
go run main.go
```

服务将在 `http://localhost:8080` 启动。

## 6. 测试API

### 健康检查
```bash
curl http://localhost:8080/health
```

### GitHub登录
在浏览器中访问：
```
http://localhost:8080/api/auth/github
```

这将重定向到GitHub授权页面，授权后会回调并返回token。

## 7. API使用示例

### 生成AI背景图
```bash
curl -X POST http://localhost:8080/api/ai/background \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1920,
    "height": 1080,
    "prompt": "科技感蓝色渐变"
  }'
```

### 获取当前用户
```bash
curl http://localhost:8080/api/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 获取用户图片列表
```bash
curl http://localhost:8080/api/ai/images \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 常见问题

### 1. 数据库连接失败
- 检查MySQL服务是否运行
- 验证 `.env` 中的数据库配置
- 确认数据库已创建

### 2. GitHub OAuth失败
- 检查Client ID和Secret是否正确
- 确认回调URL与GitHub App配置一致
- 检查网络连接

### 3. JWT Token无效
- 确认JWT_SECRET已配置
- 检查token是否过期（默认24小时）
- 验证请求头格式：`Authorization: Bearer <token>`

## 下一步

- 查看 [README.md](README.md) 了解完整功能
- 集成前端应用
- 扩展AI图片生成功能
- 添加更多运维自动化功能
