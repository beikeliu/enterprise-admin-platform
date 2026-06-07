import { Button, Space, Table, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

export function WorkflowTasksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['my-tasks'], queryFn: api.myTasks });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve' ? api.approveTicket(id, { comment: '同意' }) : api.rejectTicket(id, { comment: '驳回' }),
    onSuccess: () => {
      message.success('已处理');
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">审批任务</h1>
          <div className="page-subtitle">集中处理待我审批的工单任务。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data ?? []}
            columns={[
              { title: '工单标题', render: (_, record) => <Link to={`/tickets/${record.ticket.id}`}>{record.ticket.title}</Link> },
              { title: '申请人', render: (_, record) => record.ticket.applicantName },
              { title: '优先级', render: (_, record) => record.ticket.priority },
              { title: '任务创建时间', dataIndex: 'createdAt' },
              {
                title: '操作',
                width: 180,
                render: (_, record) => (
                  <Space>
                    <Button size="small" type="primary" onClick={() => mutation.mutate({ id: record.ticket.id, action: 'approve' })}>
                      通过
                    </Button>
                    <Button size="small" danger onClick={() => mutation.mutate({ id: record.ticket.id, action: 'reject' })}>
                      驳回
                    </Button>
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
