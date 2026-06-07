# Enterprise Admin Platform

大型中后台管理系统全栈 Monorepo。当前版本实现了第一阶段 MVP 底座：

- React 管理端：登录、后台布局、动态菜单、仪表盘、用户列表、工单列表、工单详情、创建工单、待办审批。
- NestJS API：认证、JWT、权限守卫、用户查询、工单创建/提交/审批/驳回、工作流任务、审计日志。
- 共享契约：`@enterprise/api-contracts` 使用 Zod 描述接口输入输出。
- 数据模型：Prisma schema 覆盖租户、用户、部门、角色、权限、菜单、工作流、工单、审计。

## Quick Start

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm exec prisma db push
pnpm db:seed
pnpm dev
```

默认账号：

```txt
admin / admin123
```

服务地址：

```txt
Admin Web: http://localhost:5173
Admin API: http://localhost:3000/api
```

## Deployed Demo

```txt
https://kekezs.cn/enterprise-admin/
admin / admin123
```

Deployment notes are in [docs/deployment/ubuntu.md](docs/deployment/ubuntu.md).

## Workspace

```txt
apps/
  admin-web      React 管理端
  admin-api      NestJS API
packages/
  api-contracts  前后端共享 API 契约
  shared-types   共享类型
  shared-utils   共享工具
prisma/
  schema.prisma  数据库模型
  seed.ts        初始数据
```

## Architecture Principles

- 前端只负责体验层权限，后端权限守卫才是安全边界。
- 业务模块依赖平台能力，平台能力不反向依赖业务模块。
- 工作流通过资源类型和资源 ID 关联业务，不硬编码具体工单逻辑。
- 接口输入使用 Zod 校验，逐步演进为 OpenAPI/SDK 自动生成。
- 第一阶段使用模块化单体，后续可按模块拆分服务。
