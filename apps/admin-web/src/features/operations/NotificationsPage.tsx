import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { CheckCheck, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { getChinaDateKey } from '@/lib/datetime';

type NotificationRow = {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'success' | 'warning' | 'error';
  readAt: string | null;
  createdAt: string;
};

const levelColor: Record<NotificationRow['level'], string> = {
  info: 'processing',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications });
  const createMutation = useMutation({
    mutationFn: api.createNotification,
    onSuccess: () => {
      message.success('通知已发布');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => message.error(error.message),
  });
  const readMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => {
      message.success('已标记为已读');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => message.error(error.message),
  });

  const items = data?.items ?? [];
  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">通知中心</h1>
          <div className="page-subtitle">面向租户和个人的运营消息、风险提示和处理提醒。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          发布通知
        </Button>
      </div>
      <div className="metric-grid">
        <Metric label="通知总数" value={items.length} />
        <Metric label="未读消息" value={unreadCount} />
        <Metric label="风险提示" value={items.filter((item) => item.level === 'warning' || item.level === 'error').length} />
        <Metric label="今日新增" value={items.filter((item) => item.createdAt.slice(0, 10) === getChinaDateKey()).length} />
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={items}
            expandable={{
              expandedRowRender: (record) => (
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{record.content}</Typography.Paragraph>
              ),
            }}
            columns={[
              {
                title: '等级',
                dataIndex: 'level',
                width: 100,
                render: (value: NotificationRow['level']) => <Tag color={levelColor[value]}>{value}</Tag>,
              },
              {
                title: '标题',
                dataIndex: 'title',
                render: (value, record: NotificationRow) => (
                  <Space>
                    <span style={{ fontWeight: record.readAt ? 400 : 700 }}>{value}</span>
                    {!record.readAt && <Tag color="blue">未读</Tag>}
                  </Space>
                ),
              },
              { title: '发布时间', dataIndex: 'createdAt', width: 220 },
              {
                title: '状态',
                dataIndex: 'readAt',
                width: 130,
                render: (value) => (value ? <Tag color="success">已读</Tag> : <Tag>未读</Tag>),
              },
              {
                title: '操作',
                width: 140,
                render: (_, record: NotificationRow) =>
                  record.readAt ? (
                    '-'
                  ) : (
                    <Button
                      size="small"
                      icon={<CheckCheck size={14} />}
                      loading={readMutation.isPending}
                      onClick={() => readMutation.mutate(record.id)}
                    >
                      标记已读
                    </Button>
                  ),
              },
            ]}
          />
        </div>
      </div>
      <Modal
        title="发布通知"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ level: 'info' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="title" label="标题" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="level" label="等级" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '信息', value: 'info' },
                { label: '成功', value: 'success' },
                { label: '警告', value: 'warning' },
                { label: '错误', value: 'error' },
              ]}
            />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
