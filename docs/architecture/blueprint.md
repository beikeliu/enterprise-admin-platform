# Architecture Blueprint

## Layers

```txt
Admin Web
  -> API Contracts
  -> Admin API / BFF
  -> Domain Modules
  -> Prisma / Infrastructure
```

## Core Modules

- `auth`: 登录、JWT、当前用户上下文。
- `users`: 用户查询和账号生命周期。
- `permissions`: RBAC 权限码与接口守卫。
- `tickets`: 工单业务聚合。
- `workflow`: 流程模板、实例、任务、记录。
- `audit`: 操作审计。

## Permission Code Format

```txt
{domain}:{resource}:{action}
```

Examples:

```txt
system:user:view
ticket:ticket:create
ticket:ticket:submit
ticket:ticket:approve
audit:operation-log:view
```

## MVP Workflow

```txt
Create draft ticket
  -> Submit ticket
  -> Start workflow instance
  -> Create pending task
  -> Approver approves or rejects
  -> Complete workflow instance
  -> Update ticket status
  -> Write audit log
```
