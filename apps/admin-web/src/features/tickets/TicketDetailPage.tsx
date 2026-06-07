import { Button, Descriptions, Input, List, Modal, Space, Spin, Tag, Timeline, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['ticket', id], queryFn: () => api.ticket(id), enabled: Boolean(id) });
  const submitMutation = useMutation({
    mutationFn: api.submitTicket,
    onSuccess: () => {
      message.success('已提交审批');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => message.error(error.message),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ action, comment }: { action: 'approve' | 'reject'; comment: string }) =>
      action === 'approve' ? api.approveTicket(id, { comment }) : api.rejectTicket(id, { comment }),
    onSuccess: () => {
      message.success('审批完成');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: (error) => message.error(error.message),
  });
  const commentMutation = useMutation({
    mutationFn: () => api.commentTicket(id, { content: comment }),
    onSuccess: () => {
      message.success('评论已添加');
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
    onError: (error) => message.error(error.message),
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, comment }: { action: 'withdraw' | 'close'; comment?: string }) =>
      action === 'withdraw' ? api.withdrawTicket(id, { comment }) : api.closeTicket(id, { comment }),
    onSuccess: (_, variables) => {
      message.success(variables.action === 'withdraw' ? '已撤回' : '已关闭');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: (error) => message.error(error.message),
  });

  if (isLoading || !data) return <Spin />;

  const review = (action: 'approve' | 'reject') => {
    let comment = '';
    Modal.confirm({
      title: action === 'approve' ? '通过审批' : '驳回工单',
      content: <Input.TextArea rows={4} placeholder="审批意见" onChange={(event) => (comment = event.target.value)} />,
      onOk: () => reviewMutation.mutateAsync({ action, comment }),
    });
  };

  const runAction = (action: 'withdraw' | 'close') => {
    let actionComment = '';
    Modal.confirm({
      title: action === 'withdraw' ? '撤回工单' : '关闭工单',
      content: <Input.TextArea rows={4} placeholder="备注" onChange={(event) => (actionComment = event.target.value)} />,
      onOk: () => actionMutation.mutateAsync({ action, comment: actionComment }),
    });
  };

  const comments =
    (data.comments as Array<{ id: string; content: string; createdAt: string; authorName?: string }> | undefined) ?? [];

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <div className="page-subtitle">工单详情、审批进度和操作记录。</div>
        </div>
        <Space>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/tickets')}>
            返回列表
          </Button>
          {(data.status === 'draft' || data.status === 'rejected') && (
            <Button type="primary" onClick={() => submitMutation.mutate(data.id)} loading={submitMutation.isPending}>
              提交审批
            </Button>
          )}
          {data.status === 'approving' && (
            <Button onClick={() => runAction('withdraw')} loading={actionMutation.isPending}>
              撤回
            </Button>
          )}
          {!['closed', 'cancelled'].includes(data.status) && (
            <Button danger onClick={() => runAction('close')} loading={actionMutation.isPending}>
              关闭
            </Button>
          )}
          {data.status === 'approving' && (
            <>
              <Button type="primary" onClick={() => review('approve')} loading={reviewMutation.isPending}>
                通过
              </Button>
              <Button danger onClick={() => review('reject')} loading={reviewMutation.isPending}>
                驳回
              </Button>
            </>
          )}
        </Space>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="状态">
              <Tag>{data.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{data.priority}</Descriptions.Item>
            <Descriptions.Item label="类型">{data.type}</Descriptions.Item>
            <Descriptions.Item label="申请人">{data.applicantName}</Descriptions.Item>
            <Descriptions.Item label="部门">{data.departmentName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{data.createdAt}</Descriptions.Item>
            <Descriptions.Item label="说明" span={2}>
              {data.description ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-body">
          <h3 style={{ marginTop: 0 }}>流程记录</h3>
          <Timeline
            items={
              ((data.workflow as { records?: Array<{ id: string; action: string; comment?: string; createdAt: string }> } | undefined)
                ?.records ?? []
              ).map((record) => ({
                children: `${record.action}${record.comment ? `：${record.comment}` : ''} / ${record.createdAt}`,
              }))
            }
          />
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-body">
          <h3 style={{ marginTop: 0 }}>评论</h3>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input.TextArea rows={3} value={comment} placeholder="添加评论" onChange={(event) => setComment(event.target.value)} />
            <Button
              type="primary"
              disabled={!comment.trim()}
              loading={commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
            >
              发送
            </Button>
          </Space.Compact>
          <List
            dataSource={comments}
            locale={{ emptyText: '暂无评论' }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta title={`${item.authorName ?? '-'} / ${item.createdAt}`} description={item.content} />
              </List.Item>
            )}
          />
        </div>
      </div>
    </>
  );
}
