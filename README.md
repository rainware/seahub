# Seaflow Service

Seaflow Service 是一个基于 Django 和 React 的工作流管理平台，集成了 Seaflow 核心库，提供 DAG (有向无环图) 和 Task (任务) 的管理与可视化功能。

## 技术栈

- **后端**: Python 3.12, Django 5.2, Django REST Framework, MySQL
- **前端**: Node.js v22, React 19, Vite, TailwindCSS, Shadcn UI

## 目录结构

```
.
├── api/                # Django API 应用
├── frontend/           # React 前端项目
├── seaflow/            # Seaflow 核心库
├── seaflow_backend/    # Django 项目配置
├── manage.py           # Django 管理脚本
├── requirements.txt    # Python 依赖
└── README.md           # 项目说明
```

## 环境准备

### 1. 数据库
确保本地安装并运行 MySQL，并创建数据库：
```sql
CREATE DATABASE `seaflow-service` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
默认配置连接信息（可在 `seaflow_backend/settings.py` 中修改）：
- Host: 127.0.0.1
- Port: 3306
- User: root
- Password: kevin
- Database: seaflow-service

### 2. 后端 (Backend)

使用 Python 3.12 创建虚拟环境并安装依赖：

```bash
# 创建虚拟环境
python3.12 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 数据库迁移
python manage.py migrate

# 启动服务 (默认端口 8001)
python manage.py runserver 0.0.0.0:8001
```

API 文档地址: `http://localhost:8001/api/`

### 3. 前端 (Frontend)

使用 Node.js v22 环境：

```bash
cd frontend

# 使用 nvm 切换版本 (如果安装了 nvm)
nvm use 22

# 安装依赖
npm install

# 启动开发服务器 (默认端口 5178)
npm run dev
```

访问地址: `http://localhost:5178`

## 功能特性

- **DAG 管理**: 查看和管理工作流定义。
- **任务监控**: 实时查看任务执行状态和日志。
- **可视化**: 基于 React Flow 的 DAG 流程图展示。
