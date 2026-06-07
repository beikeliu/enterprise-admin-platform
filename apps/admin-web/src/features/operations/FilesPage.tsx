import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ExternalLink, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

type FileRow = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  visibility: 'private' | 'internal' | 'public';
  uploaderName: string;
  createdAt: string;
};

const visibilityColor: Record<FileRow['visibility'], string> = {
  private: 'default',
  internal: 'processing',
  public: 'success',
};

const formatSize = (size: number) => {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
};

export function FilesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['files'], queryFn: api.files });
  const createMutation = useMutation({
    mutationFn: api.createFile,
    onSuccess: () => {
      message.success('文件记录已登记');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (error) => message.error(error.message),
  });

  const items = data?.items ?? [];
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">文件中心</h1>
          <div className="page-subtitle">登记业务附件、资料链接和内部共享文件。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          登记文件
        </Button>
      </div>
      <div className="metric-grid">
        <Metric label="文件数量" value={items.length} />
        <Metric label="总容量" value={formatSize(totalSize)} />
        <Metric label="内部文件" value={items.filter((item) => item.visibility === 'internal').length} />
        <Metric label="公开文件" value={items.filter((item) => item.visibility === 'public').length} />
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={items}
            columns={[
              {
                title: '文件名',
                dataIndex: 'name',
                render: (value, record: FileRow) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{value}</Typography.Text>
                    <Typography.Text type="secondary">{record.mimeType}</Typography.Text>
                  </Space>
                ),
              },
              { title: '大小', dataIndex: 'size', width: 120, render: formatSize },
              {
                title: '可见性',
                dataIndex: 'visibility',
                width: 120,
                render: (value: FileRow['visibility']) => <Tag color={visibilityColor[value]}>{value}</Tag>,
              },
              { title: '上传人', dataIndex: 'uploaderName', width: 130 },
              { title: '创建时间', dataIndex: 'createdAt', width: 220 },
              {
                title: '访问',
                width: 110,
                render: (_, record: FileRow) => (
                  <Button size="small" icon={<ExternalLink size={14} />} href={record.url} target="_blank">
                    打开
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Modal
        title="登记文件"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ visibility: 'internal', mimeType: 'application/pdf', size: 1024 }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="name" label="文件名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="文件 URL" rules={[{ required: true, type: 'url' }]}>
            <Input />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="mimeType" label="MIME 类型" rules={[{ required: true }]}>
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="size" label="大小（字节）" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="visibility" label="可见性" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '私有', value: 'private' },
                { label: '内部', value: 'internal' },
                { label: '公开', value: 'public' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
