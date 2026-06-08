import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  status: 'active' | 'disabled';
  department?: { name?: string };
  roles: Array<{ id: string; name: string; code: string }>;
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const keyword = searchParams.get('keyword') ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['users', keyword],
    queryFn: () => api.users(new URLSearchParams({ page: '1', pageSize: '20', keyword }).toString()),
  });
  const { data: roleData } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => api.roles('page=1&pageSize=200'),
  });
  const roleOptions = (((roleData as { items?: Array<{ id: string; name: string; code: string }> } | undefined)?.items ?? [])).map(
    (role) => ({ label: `${role.name} (${role.code})`, value: role.id }),
  );
  const createMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      message.success('用户已创建');
      form.resetFields();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => message.error(error.message),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) => api.updateUserStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => message.error(error.message),
  });
  const assignRoleMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => api.assignUserRoles(id, roleIds),
    onSuccess: () => {
      message.success('角色已更新');
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">用户管理</h1>
          <div className="page-subtitle">账号生命周期、组织关系和角色授权入口。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建用户
        </Button>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Input.Search
            allowClear
            placeholder="搜索账号或姓名"
            defaultValue={keyword}
            style={{ width: 320, marginBottom: 16 }}
            onSearch={(value) => setSearchParams(value ? { keyword: value } : {})}
          />
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={(data as { items?: UserRow[] } | undefined)?.items ?? []}
            scroll={tableScroll()}
            columns={[
              { title: '账号', dataIndex: 'username' },
              { title: '姓名', dataIndex: 'displayName' },
              { title: '邮箱', dataIndex: 'email' },
              { title: '手机', dataIndex: 'phone' },
              { title: '部门', dataIndex: ['department', 'name'] },
              {
                title: '角色',
                render: (_, record) => (
                  <Space wrap>
                    {record.roles.map((role) => (
                      <Tag key={role.id}>{role.name}</Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (value) => <Tag color={value === 'active' ? 'success' : 'default'}>{value}</Tag>,
              },
              {
                title: '操作',
                width: 190,
                render: (_, record) => (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingUser(record);
                        roleForm.setFieldsValue({ roleIds: record.roles.map((role) => role.id) });
                      }}
                    >
                      角色
                    </Button>
                    <Button
                      size="small"
                      danger={record.status === 'active'}
                      onClick={() =>
                        statusMutation.mutate({
                          id: record.id,
                          status: record.status === 'active' ? 'disabled' : 'active',
                        })
                      }
                    >
                      {record.status === 'active' ? '禁用' : '启用'}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Modal
        title="新建用户"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="displayName" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="roleIds" label="角色" initialValue={[]}>
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingUser ? `分配角色：${editingUser.displayName}` : '分配角色'}
        open={Boolean(editingUser)}
        onCancel={() => setEditingUser(null)}
        onOk={() => {
          const values = roleForm.getFieldsValue() as { roleIds?: string[] };
          assignRoleMutation.mutate({ id: editingUser!.id, roleIds: values.roleIds ?? [] });
        }}
        confirmLoading={assignRoleMutation.isPending}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="roleIds" label="角色" initialValue={[]}>
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
