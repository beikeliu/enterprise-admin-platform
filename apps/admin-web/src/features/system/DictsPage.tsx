import { Button, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { compactTableScroll, tableScroll } from '@/lib/table-scroll';

type DictRow = {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  items: Array<{ id: string; label: string; value: string; color?: string; sortOrder: number; status: string }>;
};

export function DictsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [itemDict, setItemDict] = useState<DictRow | null>(null);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['dicts'], queryFn: api.dicts });
  const createMutation = useMutation({
    mutationFn: api.createDict,
    onSuccess: () => {
      message.success('字典已创建');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['dicts'] });
    },
    onError: (error) => message.error(error.message),
  });
  const createItemMutation = useMutation({
    mutationFn: (values: { label: string; value: string; color?: string; sortOrder?: number }) =>
      api.createDictItem(itemDict!.id, values),
    onSuccess: () => {
      message.success('字典项已添加');
      setItemDict(null);
      itemForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['dicts'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">字典管理</h1>
          <div className="page-subtitle">维护业务枚举、选项和展示颜色。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          新建字典
        </Button>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            scroll={tableScroll()}
            expandable={{
              expandedRowRender: (record: DictRow) => (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={record.items}
                  scroll={compactTableScroll}
                  columns={[
                    { title: '标签', dataIndex: 'label' },
                    { title: '值', dataIndex: 'value' },
                    { title: '颜色', dataIndex: 'color', render: (value) => value ? <Tag color={value}>{value}</Tag> : '-' },
                    { title: '排序', dataIndex: 'sortOrder', width: 90 },
                    { title: '状态', dataIndex: 'status', width: 100 },
                  ]}
                />
              ),
            }}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '编码', dataIndex: 'code', width: 180 },
              { title: '说明', dataIndex: 'description' },
              { title: '字典项', render: (_, record) => record.items.length, width: 100 },
              { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag>{value}</Tag> },
              {
                title: '操作',
                width: 120,
                render: (_, record) => (
                  <Button size="small" onClick={() => setItemDict(record)}>
                    添加项
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Modal title="新建字典" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/ }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={itemDict ? `添加字典项：${itemDict.name}` : '添加字典项'} open={Boolean(itemDict)} onCancel={() => setItemDict(null)} onOk={() => itemForm.submit()} confirmLoading={createItemMutation.isPending}>
        <Form form={itemForm} layout="vertical" initialValues={{ sortOrder: 0 }} onFinish={(values) => createItemMutation.mutate(values)}>
          <Form.Item name="label" label="标签" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="value" label="值" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="color" label="颜色">
              <Input placeholder="blue / green / orange" />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
