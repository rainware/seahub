# Seahub

基于 Django 和 React 的工作流管理平台，提供 DAG、Task 和 Action 的管理与可视化。

## 技术栈

**后端**: Python 3.12, Django 5.2, Django REST Framework, MySQL  
**前端**: Node.js v22, React 19, Vite, TailwindCSS, Shadcn UI, React Flow

## 快速开始

### 1. 数据库准备

```sql
CREATE DATABASE `seaflow-service` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认配置: `root:kevin@127.0.0.1:3306/seaflow-service` (可在 `seahub/settings.py` 修改)

### 2. 启动后端

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py populate_fake_data  # 可选：生成测试数据
python manage.py runserver 0.0.0.0:8001
```

访问: http://localhost:8001/api/

### 3. 启动前端

```bash
cd frontend
nvm use 22  # 如已安装 nvm
npm install
npm run dev
```

访问: http://localhost:5179

## 核心功能

- **DAG 管理** (`/dags`): 创建、查看、触发 DAG，支持可视化编辑和批量导入
- **任务监控** (`/tasks`): 实时查看任务状态、执行流程图、输入输出和日志
- **动作库** (`/actions`): 管理可复用的 Action，支持自定义和批量导入

所有列表页均支持分页（默认 20 条/页）

## API 接口

**基础 URL**: `http://localhost:8001/api/`

### 主要端点

- `GET /dags/` - DAG 列表（分页）
- `GET /dags/{id}/` - DAG 详情
- `POST /dags/` - 创建 DAG
- `POST /dags/{id}/trigger/` - 触发执行
- `GET /tasks/` - 任务列表（分页）
- `GET /tasks/{id}/` - 任务详情
- `GET /actions/` - Action 列表（分页）
- `POST /actions/` - 创建 Action
- `DELETE /actions/{id}/` - 删除 Action

**分页参数**: `?page=1&page_size=20`

**响应格式**:
```json
{
  "count": 100,
  "next": "...",
  "previous": "...",
  "results": [...]
}
```

## 开发说明

- **测试数据**: `python manage.py populate_fake_data`
- **清空数据**: `python drop_tables.py && python manage.py migrate`
- **前端构建**: `cd frontend && npm run build`
- **热重载**: 前后端均支持热重载

---

**Seahub v1.0**
