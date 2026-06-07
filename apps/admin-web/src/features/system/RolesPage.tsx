import { Button, Checkbox, Form, Input, Modal, Segmented, Space, Table, Tag, Tooltip, message } from 'antd';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

type RoleRow = {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  userCount: number;
  permissions: string[];
  createdAt: string;
};

export function RolesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const keyword = searchParams.get('keyword') ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['roles', keyword],
    queryFn: () => api.roles(new URLSearchParams({ page: '1', pageSize: '20', keyword }).toString()),
  });
  const { data: permissionData } = useQuery({ queryKey: ['permissions'], queryFn: api.permissions });
  const assignMutation = useMutation({
    mutationFn: () => api.assignRolePermissions(editingRole!.id, selectedPermissions),
    onSuccess: () => {
      message.success('权限已更新');
      setEditingRole(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => message.error(error.message),
  });
  const createMutation = useMutation({
    mutationFn: api.createRole,
    onSuccess: () => {
      message.success('角色已创建');
      createForm.resetFields();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => message.error(error.message),
  });

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Array<{ label: string; value: string }>>();
    for (const permission of permissionData?.items ?? []) {
      const items = groups.get(permission.resource) ?? [];
      items.push({ label: `${permission.name} (${permission.code})`, value: permission.code });
      groups.set(permission.resource, items);
    }
    return Array.from(groups.entries());
  }, [permissionData]);
  const roles = ((data as { items?: RoleRow[] } | undefined)?.items ?? []);
  const matrixRows = (permissionData?.items ?? []).map((permission) => ({
    key: permission.code,
    code: permission.code,
    name: permission.name,
    resource: permission.resource,
    action: permission.action,
  }));

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">角色权限</h1>
          <div className="page-subtitle">集中维护角色、权限码和授权范围。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建角色
        </Button>
      </div>
      <div className="panel">
        <div className="panel-body">
          <div className="table-toolbar">
            <Input.Search
              allowClear
              placeholder="搜索角色名称或编码"
              defaultValue={keyword}
              style={{ width: 320 }}
              onSearch={(value) => setSearchParams(value ? { keyword: value } : {})}
            />
            <Segmented
              value={viewMode}
              options={[
                { label: '角色列表', value: 'list' },
                { label: '权限矩阵', value: 'matrix' },
              ]}
              onChange={(value) => setViewMode(value as 'list' | 'matrix')}
            />
          </div>
          {viewMode === 'list' ? (
            <Table
              rowKey="id"
              loading={isLoading}
              dataSource={roles}
              columns={[
                { title: '角色', dataIndex: 'name' },
                { title: '编码', dataIndex: 'code', width: 160 },
                { title: '用户数', dataIndex: 'userCount', width: 100 },
                {
                  title: '权限数',
                  width: 100,
                  render: (_, record) => record.permissions.length,
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (value) => <Tag color={value === 'active' ? 'success' : 'default'}>{value}</Tag>,
                },
                { title: '说明', dataIndex: 'description' },
                {
                  title: '操作',
                  width: 130,
                  render: (_, record) => (
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingRole(record);
                        setSelectedPermissions(record.permissions);
                      }}
                    >
                      分配权限
                    </Button>
                  ),
                },
              ]}
            />
          ) : (
            <Table
              rowKey="code"
              size="small"
              loading={isLoading}
              dataSource={matrixRows}
              scroll={{ x: Math.max(980, 320 + roles.length * 150), y: 560 }}
              pagination={false}
              columns={[
                { title: '资源', dataIndex: 'resource', width: 150, fixed: 'left' },
                {
                  title: '权限',
                  dataIndex: 'name',
                  width: 210,
                  fixed: 'left',
                  render: (value, record) => (
                    <Tooltip title={record.code}>
                      <span>{value}</span>
                    </Tooltip>
                  ),
                },
                { title: '动作', dataIndex: 'action', width: 130 },
                ...roles.map((role) => ({
                  title: role.name,
                  dataIndex: role.id,
                  width: 150,
                  align: 'center' as const,
                  render: (_: unknown, record: { code: string }) =>
                    role.permissions.includes(record.code) ? (
                      <CheckCircle2 size={18} color="#14b8a6" />
                    ) : (
                      <Minus size={18} color="#cbd5e1" />
                    ),
                })),
              ]}
            />
          )}
        </div>
      </div>
      <Modal
        title={editingRole ? `分配权限：${editingRole.name}` : '分配权限'}
        open={Boolean(editingRole)}
        onCancel={() => setEditingRole(null)}
        onOk={() => assignMutation.mutate()}
        confirmLoading={assignMutation.isPending}
        width={820}
      >
        <Space direction="vertical" size={18} style={{ width: '100%', maxHeight: 520, overflow: 'auto' }}>
          {permissionGroups.map(([resource, options]) => (
            <div key={resource}>
              <strong>{resource}</strong>
              <Checkbox.Group
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}
                options={options}
                value={selectedPermissions}
                onChange={(values) => setSelectedPermissions(values.map(String))}
              />
            </div>
          ))}
        </Space>
      </Modal>
      <Modal
        title="新建角色"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={820}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ permissionCodes: [] }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label="角色编码"
            rules={[{ required: true, pattern: /^[a-z][a-z0-9_-]*$/, message: '使用小写字母、数字、- 或 _' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="permissionCodes" label="权限">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={18} style={{ width: '100%', maxHeight: 420, overflow: 'auto' }}>
                {permissionGroups.map(([resource, options]) => (
                  <div key={resource}>
                    <strong>{resource}</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                      {options.map((option) => (
                        <Checkbox key={option.value} value={option.value}>
                          {option.label}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
