import { Button, Descriptions, Input, List, Modal, Space, Spin, Tag, Timeline, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle, RotateCcw, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

type TicketAction = 'approve' | 'reject' | 'withdraw' | 'close';

const actionCopy: Record<TicketAction, { title: string; okText: string; placeholder: string; danger?: boolean }> = {
  approve: { title: '通过审批', okText: '确认通过', placeholder: '填写审批意见（可选）' },
  reject: { title: '驳回工单', okText: '确认驳回', placeholder: '请填写驳回原因，方便申请人修改', danger: true },
  withdraw: { title: '撤回工单', okText: '确认撤回', placeholder: '填写撤回原因（可选）' },
  close: { title: '关闭工单（终止业务流程）', okText: '确认关闭工单', placeholder: '请说明关闭原因，关闭后工单将不再继续流转', danger: true },
};

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState<TicketAction | null>(null);
  const [actionComment, setActionComment] = useState('');
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

  const openAction = (action: TicketAction) => {
    setActionComment('');
    setPendingAction(action);
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction === 'approve' || pendingAction === 'reject') {
      await reviewMutation.mutateAsync({ action: pendingAction, comment: actionComment });
    } else {
      await actionMutation.mutateAsync({ action: pendingAction, comment: actionComment });
    }
    setPendingAction(null);
    setActionComment('');
  };

  const comments =
    (data.comments as Array<{ id: string; content: string; createdAt: string; authorName?: string }> | undefined) ?? [];
  const currentActionCopy = pendingAction ? actionCopy[pendingAction] : null;
  const actionLoading = reviewMutation.isPending || actionMutation.isPending;

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <div className="page-subtitle">工单详情、审批进度和操作记录。</div>
        </div>
        <Space wrap>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/tickets')}>
            返回列表
          </Button>
          {(data.status === 'draft' || data.status === 'rejected') && (
            <Button type="primary" icon={<Send size={16} />} onClick={() => submitMutation.mutate(data.id)} loading={submitMutation.isPending}>
              提交审批
            </Button>
          )}
          {data.status === 'approving' && (
            <Button icon={<RotateCcw size={16} />} onClick={() => openAction('withdraw')} loading={actionMutation.isPending}>
              撤回工单
            </Button>
          )}
          {!['closed', 'cancelled'].includes(data.status) && (
            <Button danger icon={<Ban size={16} />} onClick={() => openAction('close')} loading={actionMutation.isPending}>
              关闭工单
            </Button>
          )}
          {data.status === 'approving' && (
            <>
              <Button type="primary" icon={<CheckCircle size={16} />} onClick={() => openAction('approve')} loading={reviewMutation.isPending}>
                通过审批
              </Button>
              <Button danger icon={<XCircle size={16} />} onClick={() => openAction('reject')} loading={reviewMutation.isPending}>
                驳回工单
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
          <div className="comment-composer">
            <Input.TextArea rows={3} value={comment} placeholder="添加评论" onChange={(event) => setComment(event.target.value)} />
            <div className="comment-composer-actions">
              <Button
                type="primary"
                icon={<Send size={16} />}
                disabled={!comment.trim()}
                loading={commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
              >
                发送评论
              </Button>
            </div>
          </div>
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
      <Modal
        title={currentActionCopy?.title}
        open={Boolean(pendingAction)}
        okText={currentActionCopy?.okText}
        okButtonProps={{ danger: currentActionCopy?.danger }}
        confirmLoading={actionLoading}
        onCancel={() => {
          if (actionLoading) return;
          setPendingAction(null);
          setActionComment('');
        }}
        onOk={runPendingAction}
      >
        <Input.TextArea
          rows={5}
          value={actionComment}
          placeholder={currentActionCopy?.placeholder}
          onChange={(event) => setActionComment(event.target.value)}
        />
      </Modal>
    </>
  );
}
