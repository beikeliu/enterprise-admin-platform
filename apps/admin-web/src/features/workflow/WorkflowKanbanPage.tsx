import { Button, Empty, Space, Tag, message } from 'antd';
import { Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { Ticket } from '@enterprise/api-contracts';
import { api } from '@/lib/api';

const columns: Array<{ key: Ticket['status']; title: string; color: string }> = [
  { key: 'draft', title: '草稿', color: 'default' },
  { key: 'approving', title: '审批中', color: 'processing' },
  { key: 'approved', title: '已通过', color: 'success' },
  { key: 'rejected', title: '已驳回', color: 'error' },
  { key: 'closed', title: '已关闭', color: 'default' },
];

const priorityColor: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'warning',
  urgent: 'error',
};

export function WorkflowKanbanPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'kanban'],
    queryFn: () => api.tickets('page=1&pageSize=200'),
  });
  const submitMutation = useMutation({
    mutationFn: api.submitTicket,
    onSuccess: () => {
      message.success('已提交审批');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => message.error(error.message),
  });
  const tickets = data?.items ?? [];

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">任务看板</h1>
          <div className="page-subtitle">按流转状态组织工单，快速识别积压、驳回和已完成事项。</div>
        </div>
      </div>
      <div className="kanban-board" aria-busy={isLoading}>
        {columns.map((column) => {
          const items = tickets.filter((ticket) => ticket.status === column.key);
          return (
            <section className="kanban-column" key={column.key}>
              <div className="kanban-column-header">
                <Space>
                  <Tag color={column.color}>{column.title}</Tag>
                  <strong>{items.length}</strong>
                </Space>
              </div>
              <div className="kanban-card-list">
                {items.length ? (
                  items.map((ticket) => (
                    <article className="kanban-card" key={ticket.id}>
                      <Link className="kanban-title" to={`/tickets/${ticket.id}`}>
                        {ticket.title}
                      </Link>
                      <div className="kanban-meta">
                        <span>{ticket.applicantName}</span>
                        <span>{ticket.departmentName ?? '-'}</span>
                      </div>
                      <div className="kanban-footer">
                        <Tag color={priorityColor[ticket.priority] ?? 'default'}>{ticket.priority}</Tag>
                        {(ticket.status === 'draft' || ticket.status === 'rejected') && (
                          <Button
                            size="small"
                            icon={<Send size={14} />}
                            loading={submitMutation.isPending}
                            onClick={() => submitMutation.mutate(ticket.id)}
                          >
                            提交
                          </Button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无工单" />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
