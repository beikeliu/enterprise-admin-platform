import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type DepartmentRow = {
  id: string;
  parentId?: string | null;
  name: string;
  code: string;
  path: string;
  sortOrder: number;
  status: 'active' | 'disabled';
  userCount: number;
  ticketCount: number;
};

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: api.departments });
  const rows = data?.items ?? [];
  const parentOptions = rows.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }));
  const treeData = useMemo(() => buildDepartmentTree(rows), [rows]);
  const selectedDepartment = rows.find((item) => item.id === selectedId);
  const visibleRows = selectedDepartment
    ? rows.filter((item) => item.id === selectedDepartment.id || item.path.startsWith(`${selectedDepartment.path}/`))
    : rows;
  const totalUsers = rows.reduce((sum, item) => sum + item.userCount, 0);
  const totalTickets = rows.reduce((sum, item) => sum + item.ticketCount, 0);
  const activeRate = rows.length ? Math.round((rows.filter((item) => item.status === 'active').length / rows.length) * 100) : 0;

  const createMutation = useMutation({
    mutationFn: api.createDepartment,
    onSuccess: () => {
      message.success('部门已创建');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => message.error(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: (values: Partial<DepartmentRow>) => api.updateDepartment(editing!.id, values),
    onSuccess: () => {
      message.success('部门已更新');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">部门管理</h1>
          <div className="page-subtitle">维护组织结构、部门编码、层级路径和组织资源承载。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建部门
        </Button>
      </div>
      <div className="metric-grid">
        <Metric label="组织单元" value={rows.length} tone="blue" />
        <Metric label="成员数" value={totalUsers} tone="green" />
        <Metric label="关联工单" value={totalTickets} tone="amber" />
        <Metric label="启用率" value={`${activeRate}%`} tone="cyan" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <div className="panel-body">
            <div className="section-title">组织架构树</div>
            <Tree
              blockNode
              defaultExpandAll
              selectedKeys={selectedId ? [selectedId] : []}
              treeData={treeData}
              onSelect={(keys) => setSelectedId(keys[0]?.toString())}
            />
            {selectedId && (
              <Button style={{ marginTop: 14 }} onClick={() => setSelectedId(undefined)}>
                查看全部
              </Button>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <Table
              rowKey="id"
              loading={isLoading}
              dataSource={visibleRows}
              scroll={tableScroll()}
              pagination={false}
              columns={[
                { title: '名称', dataIndex: 'name' },
                { title: '编码', dataIndex: 'code', width: 140 },
                { title: '路径', dataIndex: 'path' },
                { title: '成员', dataIndex: 'userCount', width: 80 },
                { title: '工单', dataIndex: 'ticketCount', width: 80 },
                { title: '排序', dataIndex: 'sortOrder', width: 90 },
                { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === 'active' ? 'success' : 'default'}>{value}</Tag> },
                {
                  title: '操作',
                  width: 100,
                  render: (_, record) => (
                    <Button
                      size="small"
                      onClick={() => {
                        setEditing(record);
                        editForm.setFieldsValue(record);
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
      </div>
      <Modal title="新建部门" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" initialValues={{ sortOrder: 0 }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true, pattern: /^[a-z][a-z0-9_-]*$/ }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="上级部门">
            <Select allowClear options={parentOptions} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={editing ? `编辑部门：${editing.name}` : '编辑部门'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => editForm.submit()} confirmLoading={updateMutation.isPending}>
        <Form form={editForm} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select style={{ width: 120 }} options={[{ label: '启用', value: 'active' }, { label: '禁用', value: 'disabled' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}

function buildDepartmentTree(rows: DepartmentRow[]): DataNode[] {
  const nodeMap = new Map<string, DataNode & { children: DataNode[] }>();
  for (const row of rows) {
    nodeMap.set(row.id, {
      key: row.id,
      title: `${row.name} (${row.userCount}人 / ${row.ticketCount}单)`,
      children: [],
    });
  }
  const roots: Array<DataNode & { children: DataNode[] }> = [];
  for (const row of rows) {
    const node = nodeMap.get(row.id);
    if (!node) continue;
    if (row.parentId && nodeMap.has(row.parentId)) {
      nodeMap.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
