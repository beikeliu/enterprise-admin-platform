import { Button, Input, Space, Table, Tag, message } from 'antd';
import { Plus, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

const statusColor: Record<string, string> = {
  draft: 'default',
  approving: 'processing',
  approved: 'success',
  rejected: 'error',
  closed: 'default',
};

export function TicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const queryString = new URLSearchParams({ page: '1', pageSize: '20', keyword }).toString();
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', keyword],
    queryFn: () => api.tickets(queryString),
  });
  const submitMutation = useMutation({
    mutationFn: api.submitTicket,
    onSuccess: () => {
      message.success('已提交审批');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">工单中心</h1>
          <div className="page-subtitle">创建、提交、追踪和关闭跨部门运营工单。</div>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/tickets/new')}>
          新建工单
        </Button>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Space style={{ marginBottom: 16 }}>
            <Input.Search
              allowClear
              placeholder="搜索标题、类型、申请人"
              defaultValue={keyword}
              style={{ width: 320 }}
              onSearch={(value) => setSearchParams(value ? { keyword: value } : {})}
            />
          </Space>
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            scroll={tableScroll()}
            pagination={{ total: data?.total, pageSize: data?.pageSize ?? 20 }}
            columns={[
              { title: '标题', dataIndex: 'title', render: (value, record) => <Link to={`/tickets/${record.id}`}>{value}</Link> },
              { title: '类型', dataIndex: 'type', width: 120 },
              { title: '申请人', dataIndex: 'applicantName', width: 130 },
              { title: '部门', dataIndex: 'departmentName', width: 150 },
              { title: '优先级', dataIndex: 'priority', width: 120 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 120,
                render: (value) => <Tag color={statusColor[value] ?? 'default'}>{value}</Tag>,
              },
              {
                title: '操作',
                width: 180,
                render: (_, record) => (
                  <Space>
                    <Link to={`/tickets/${record.id}`}>查看</Link>
                    {(record.status === 'draft' || record.status === 'rejected') && (
                      <Button
                        size="small"
                        icon={<Send size={14} />}
                        loading={submitMutation.isPending}
                        onClick={() => submitMutation.mutate(record.id)}
                      >
                        提交
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
