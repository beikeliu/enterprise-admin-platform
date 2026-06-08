import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type MenuRow = {
  id: string;
  name: string;
  routePath?: string;
  icon?: string;
  permissionCode?: string;
  sortOrder: number;
  visible: boolean;
  status: 'active' | 'disabled';
  updatedAt: string;
};

export function MenusPage() {
  const queryClient = useQueryClient();
  const [editingMenu, setEditingMenu] = useState<MenuRow | null>(null);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['menus'], queryFn: api.menus });
  const { data: permissionData } = useQuery({ queryKey: ['permissions'], queryFn: api.permissions });
  const updateMutation = useMutation({
    mutationFn: (values: Partial<MenuRow>) =>
      api.updateMenu(editingMenu!.id, {
        ...values,
        permissionCode: values.permissionCode || null,
        icon: values.icon || null,
      }),
    onSuccess: () => {
      message.success('菜单已更新');
      setEditingMenu(null);
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">菜单管理</h1>
          <div className="page-subtitle">维护导航展示、排序和菜单权限绑定。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            scroll={tableScroll()}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '路径', dataIndex: 'routePath' },
              { title: '图标', dataIndex: 'icon', width: 140 },
              { title: '权限码', dataIndex: 'permissionCode', ellipsis: true },
              { title: '排序', dataIndex: 'sortOrder', width: 90 },
              { title: '可见', dataIndex: 'visible', width: 90, render: (value) => <Switch size="small" checked={value} disabled /> },
              { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === 'active' ? 'success' : 'default'}>{value}</Tag> },
              {
                title: '操作',
                width: 100,
                render: (_, record) => (
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingMenu(record);
                      form.setFieldsValue(record);
                    }}
                  >
                    编辑
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Modal
        title={editingMenu ? `编辑菜单：${editingMenu.name}` : '编辑菜单'}
        open={Boolean(editingMenu)}
        onCancel={() => setEditingMenu(null)}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input />
          </Form.Item>
          <Form.Item name="permissionCode" label="权限码">
            <Select
              allowClear
              showSearch
              options={(permissionData?.items ?? []).map((permission) => ({
                label: `${permission.name} (${permission.code})`,
                value: permission.code,
              }))}
            />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="visible" label="可见" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                style={{ width: 120 }}
                options={[
                  { label: '启用', value: 'active' },
                  { label: '禁用', value: 'disabled' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
