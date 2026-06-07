import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  ['system:user:view', '查看用户', 'user', 'view'],
  ['system:user:create', '创建用户', 'user', 'create'],
  ['system:user:update', '更新用户', 'user', 'update'],
  ['system:user:disable', '禁用用户', 'user', 'disable'],
  ['system:role:view', '查看角色', 'role', 'view'],
  ['system:role:create', '创建角色', 'role', 'create'],
  ['system:role:assign-permission', '分配权限', 'role', 'assign-permission'],
  ['system:menu:view', '查看菜单', 'menu', 'view'],
  ['system:menu:update', '更新菜单', 'menu', 'update'],
  ['system:department:view', '查看部门', 'department', 'view'],
  ['system:department:create', '创建部门', 'department', 'create'],
  ['system:department:update', '更新部门', 'department', 'update'],
  ['system:monitor:view', '查看系统监控', 'system-monitor', 'view'],
  ['config:dict:view', '查看字典', 'dict', 'view'],
  ['config:dict:create', '创建字典', 'dict', 'create'],
  ['config:dict:update', '更新字典', 'dict', 'update'],
  ['config:feature-flag:view', '查看功能开关', 'feature-flag', 'view'],
  ['config:feature-flag:update', '更新功能开关', 'feature-flag', 'update'],
  ['notification:message:view', '查看通知', 'notification', 'view'],
  ['notification:message:create', '创建通知', 'notification', 'create'],
  ['file:asset:view', '查看文件', 'file-asset', 'view'],
  ['file:asset:create', '登记文件', 'file-asset', 'create'],
  ['report:dashboard:view', '查看报表', 'report', 'view'],
  ['ticket:ticket:view', '查看工单', 'ticket', 'view'],
  ['ticket:ticket:create', '创建工单', 'ticket', 'create'],
  ['ticket:ticket:submit', '提交工单', 'ticket', 'submit'],
  ['ticket:ticket:approve', '审批工单', 'ticket', 'approve'],
  ['ticket:ticket:reject', '驳回工单', 'ticket', 'reject'],
  ['ticket:ticket:comment', '评论工单', 'ticket', 'comment'],
  ['ticket:ticket:withdraw', '撤回工单', 'ticket', 'withdraw'],
  ['ticket:ticket:close', '关闭工单', 'ticket', 'close'],
  ['workflow:template:view', '查看流程模板', 'workflow-template', 'view'],
  ['audit:operation-log:view', '查看审计日志', 'audit-log', 'view'],
] as const;

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { code: 'demo' },
    update: {},
    create: { name: 'Demo Group', code: 'demo' },
  });

  const department = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ops' } },
    update: {
      name: '平台运营部',
      path: '/ops',
      status: 'active',
    },
    create: {
      tenantId: tenant.id,
      name: '平台运营部',
      code: 'ops',
      path: '/ops',
    },
  });
  const childDepartments = [
    { code: 'ops-platform', name: '平台运营组', parentId: department.id, path: '/ops/ops-platform', sortOrder: 10 },
    { code: 'risk-control', name: '风控治理组', parentId: department.id, path: '/ops/risk-control', sortOrder: 20 },
    { code: 'finance', name: '财务结算组', parentId: department.id, path: '/ops/finance', sortOrder: 30 },
    { code: 'data-center', name: '数据分析组', parentId: department.id, path: '/ops/data-center', sortOrder: 40 },
  ];
  for (const item of childDepartments) {
    await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: item.code } },
      update: {
        name: item.name,
        parentId: item.parentId,
        path: item.path,
        sortOrder: item.sortOrder,
        status: 'active',
      },
      create: {
        tenantId: tenant.id,
        name: item.name,
        code: item.code,
        parentId: item.parentId,
        path: item.path,
        sortOrder: item.sortOrder,
      },
    });
  }

  for (const [code, name, resource, action] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, name, resource, action },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '超级管理员',
      code: 'admin',
      description: '拥有平台全部权限',
    },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const roleSeeds = [
    {
      code: 'ops-manager',
      name: '运营管理员',
      description: '处理工单、通知、文件和运营报表',
      permissionCodes: [
        'ticket:ticket:view',
        'ticket:ticket:create',
        'ticket:ticket:submit',
        'ticket:ticket:approve',
        'ticket:ticket:reject',
        'ticket:ticket:comment',
        'notification:message:view',
        'notification:message:create',
        'file:asset:view',
        'file:asset:create',
        'report:dashboard:view',
        'workflow:template:view',
        'system:monitor:view',
      ],
    },
    {
      code: 'auditor',
      name: '审计员',
      description: '查看审计、报表和只读业务数据',
      permissionCodes: [
        'system:user:view',
        'system:role:view',
        'ticket:ticket:view',
        'audit:operation-log:view',
        'report:dashboard:view',
      ],
    },
    {
      code: 'viewer',
      name: '只读观察员',
      description: '查看仪表盘、工单和基础配置',
      permissionCodes: [
        'ticket:ticket:view',
        'workflow:template:view',
        'config:dict:view',
        'config:feature-flag:view',
        'notification:message:view',
      ],
    },
  ];
  for (const roleSeed of roleSeeds) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: roleSeed.code } },
      update: { name: roleSeed.name, description: roleSeed.description, status: 'active' },
      create: {
        tenantId: tenant.id,
        name: roleSeed.name,
        code: roleSeed.code,
        description: roleSeed.description,
      },
    });
    const rolePermissions = await prisma.permission.findMany({
      where: { code: { in: roleSeed.permissionCodes } },
      select: { id: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  const admin = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      displayName: '平台管理员',
      email: 'admin@example.com',
      phone: '18800000000',
      departmentId: department.id,
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const menus = [
    { tenantId: tenant.id, name: '仪表盘', routePath: '/dashboard', icon: 'LayoutDashboard', sortOrder: 1 },
    { tenantId: tenant.id, name: '工单中心', routePath: '/tickets', icon: 'ClipboardList', permissionCode: 'ticket:ticket:view', sortOrder: 2 },
    { tenantId: tenant.id, name: '审批任务', routePath: '/workflow/tasks', icon: 'GitPullRequest', permissionCode: 'ticket:ticket:approve', sortOrder: 3 },
    { tenantId: tenant.id, name: '任务看板', routePath: '/workflow/kanban', icon: 'GitPullRequest', permissionCode: 'ticket:ticket:view', sortOrder: 4 },
    { tenantId: tenant.id, name: '流程模板', routePath: '/workflow/templates', icon: 'GitPullRequest', permissionCode: 'workflow:template:view', sortOrder: 5 },
    { tenantId: tenant.id, name: '用户管理', routePath: '/system/users', icon: 'Settings', permissionCode: 'system:user:view', sortOrder: 6 },
    { tenantId: tenant.id, name: '角色权限', routePath: '/system/roles', icon: 'ShieldCheck', permissionCode: 'system:role:view', sortOrder: 7 },
    { tenantId: tenant.id, name: '部门管理', routePath: '/system/departments', icon: 'Settings', permissionCode: 'system:department:view', sortOrder: 8 },
    { tenantId: tenant.id, name: '菜单管理', routePath: '/system/menus', icon: 'Settings', permissionCode: 'system:menu:view', sortOrder: 9 },
    { tenantId: tenant.id, name: '字典管理', routePath: '/config/dicts', icon: 'Settings', permissionCode: 'config:dict:view', sortOrder: 10 },
    { tenantId: tenant.id, name: '功能开关', routePath: '/config/feature-flags', icon: 'Settings', permissionCode: 'config:feature-flag:view', sortOrder: 11 },
    { tenantId: tenant.id, name: '通知中心', routePath: '/notifications', icon: 'Settings', permissionCode: 'notification:message:view', sortOrder: 12 },
    { tenantId: tenant.id, name: '文件中心', routePath: '/files', icon: 'Settings', permissionCode: 'file:asset:view', sortOrder: 13 },
    { tenantId: tenant.id, name: '报表中心', routePath: '/reports/operations', icon: 'LayoutDashboard', permissionCode: 'report:dashboard:view', sortOrder: 14 },
    { tenantId: tenant.id, name: '系统监控', routePath: '/system/monitor', icon: 'LayoutDashboard', permissionCode: 'system:monitor:view', sortOrder: 15 },
    { tenantId: tenant.id, name: '审计日志', routePath: '/audit/logs', icon: 'ShieldCheck', permissionCode: 'audit:operation-log:view', sortOrder: 16 },
  ];
  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { tenantId_routePath: { tenantId: tenant.id, routePath: menu.routePath } },
      update: menu,
      create: menu,
    });
  }

  const template = await prisma.workflowTemplate.upsert({
    where: { tenantId_code_version: { tenantId: tenant.id, code: 'ticket-default', version: 1 } },
    update: {
      name: '默认工单审批',
      resourceType: 'ticket',
      status: 'published',
    },
    create: {
      tenantId: tenant.id,
      name: '默认工单审批',
      code: 'ticket-default',
      resourceType: 'ticket',
      status: 'published',
      nodes: {
        create: [
          {
            nodeKey: 'start',
            nodeType: 'start',
            name: '提交工单',
            sortOrder: 0,
          },
          {
            nodeKey: 'manager-review',
            nodeType: 'approval',
            name: '直属经理审批',
            assigneeType: 'role',
            assigneeConfig: { roleCode: 'admin' },
            sortOrder: 10,
          },
          {
            nodeKey: 'ops-review',
            nodeType: 'approval',
            name: '运营审批',
            assigneeType: 'role',
            assigneeConfig: { roleCode: 'admin' },
            sortOrder: 20,
          },
          {
            nodeKey: 'archive-notify',
            nodeType: 'notify',
            name: '归档通知',
            sortOrder: 30,
          },
          {
            nodeKey: 'end',
            nodeType: 'end',
            name: '流程结束',
            sortOrder: 40,
          },
        ],
      },
    },
  });

  const workflowNodes = [
    { nodeKey: 'start', nodeType: 'start', name: '提交工单', sortOrder: 0 },
    {
      nodeKey: 'manager-review',
      nodeType: 'approval',
      name: '直属经理审批',
      assigneeType: 'role',
      assigneeConfig: { roleCode: 'admin' },
      sortOrder: 10,
    },
    {
      nodeKey: 'ops-review',
      nodeType: 'approval',
      name: '运营审批',
      assigneeType: 'role',
      assigneeConfig: { roleCode: 'admin' },
      sortOrder: 20,
    },
    { nodeKey: 'archive-notify', nodeType: 'notify', name: '归档通知', sortOrder: 30 },
    { nodeKey: 'end', nodeType: 'end', name: '流程结束', sortOrder: 40 },
  ];
  for (const node of workflowNodes) {
    const existingNode = await prisma.workflowNode.findFirst({
      where: { templateId: template.id, nodeKey: node.nodeKey },
    });
    const data = {
      templateId: template.id,
      nodeKey: node.nodeKey,
      nodeType: node.nodeType,
      name: node.name,
      assigneeType: 'assigneeType' in node ? node.assigneeType : null,
      assigneeConfig: 'assigneeConfig' in node ? node.assigneeConfig : undefined,
      sortOrder: node.sortOrder,
    };
    if (existingNode) {
      await prisma.workflowNode.update({ where: { id: existingNode.id }, data });
    } else {
      await prisma.workflowNode.create({
        data,
      });
    }
  }

  await prisma.workflowEdge.deleteMany({ where: { templateId: template.id } });
  await prisma.workflowEdge.createMany({
    data: [
      { templateId: template.id, sourceNodeKey: 'start', targetNodeKey: 'manager-review' },
      { templateId: template.id, sourceNodeKey: 'manager-review', targetNodeKey: 'ops-review' },
      { templateId: template.id, sourceNodeKey: 'ops-review', targetNodeKey: 'archive-notify' },
      { templateId: template.id, sourceNodeKey: 'archive-notify', targetNodeKey: 'end' },
    ],
  });

  const ticketCount = await prisma.ticket.count({ where: { tenantId: tenant.id } });
  if (ticketCount === 0) {
    await prisma.ticket.createMany({
      data: [
      {
        tenantId: tenant.id,
        title: '开通华东区域运营报表权限',
        type: 'permission',
        priority: 'high',
        status: 'draft',
        applicantId: admin.id,
        departmentId: department.id,
        description: '需要临时查看华东区域近 30 天运营数据，用于专项分析。',
        formData: { region: '华东', durationDays: 30 },
      },
      {
        tenantId: tenant.id,
        title: '新增财务导出字段脱敏规则',
        type: 'config',
        priority: 'medium',
        status: 'approved',
        applicantId: admin.id,
        departmentId: department.id,
        description: '财务导出手机号和邮箱时需要默认脱敏。',
        formData: { fields: ['phone', 'email'] },
      },
      ],
    });
  }

  const ticketType = await prisma.dictType.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ticket_type' } },
    update: { name: '工单类型', status: 'active' },
    create: { tenantId: tenant.id, name: '工单类型', code: 'ticket_type', description: '工单创建时可选的业务类型' },
  });
  for (const item of [
    { label: '权限申请', value: 'permission', color: 'blue', sortOrder: 1 },
    { label: '配置变更', value: 'config', color: 'purple', sortOrder: 2 },
    { label: '数据修复', value: 'data-fix', color: 'orange', sortOrder: 3 },
    { label: '流程支持', value: 'workflow', color: 'green', sortOrder: 4 },
  ]) {
    await prisma.dictItem.upsert({
      where: { typeId_value: { typeId: ticketType.id, value: item.value } },
      update: item,
      create: { typeId: ticketType.id, ...item },
    });
  }

  for (const flag of [
    { name: '新版工单详情', code: 'new_ticket_detail', enabled: true, description: '启用新版工单详情布局' },
    { name: '导出审批', code: 'export_approval', enabled: false, description: '导出前要求额外审批' },
  ]) {
    await prisma.featureFlag.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: flag.code } },
      update: flag,
      create: { tenantId: tenant.id, ...flag },
    });
  }

  const notificationCount = await prisma.notification.count({ where: { tenantId: tenant.id } });
  if (notificationCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: admin.id,
          title: '平台初始化完成',
          content: '企业级运营管理平台基础模块已经启用。',
          level: 'success',
        },
        {
          tenantId: tenant.id,
          title: '工单审批提醒',
          content: '请及时处理待办审批任务。',
          level: 'info',
        },
      ],
    });
  }

  const fileCount = await prisma.fileAsset.count({ where: { tenantId: tenant.id } });
  if (fileCount === 0) {
    await prisma.fileAsset.create({
      data: {
        tenantId: tenant.id,
        uploaderId: admin.id,
        name: '运营报表模板.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 24576,
        url: 'https://kekezs.cn/enterprise-admin/',
        visibility: 'internal',
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
