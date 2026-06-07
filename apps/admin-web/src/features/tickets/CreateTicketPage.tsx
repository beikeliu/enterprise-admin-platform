import { Button, Form, Input, Select, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

export function CreateTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backToList = () => navigate('/tickets');
  const mutation = useMutation({
    mutationFn: api.createTicket,
    onSuccess: (ticket) => {
      message.success('工单已创建');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">新建工单</h1>
          <div className="page-subtitle">提交前会以草稿保存，可在详情页发起审批。</div>
        </div>
        <Button icon={<ArrowLeft size={16} />} onClick={backToList}>
          返回列表
        </Button>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Form
            layout="vertical"
            style={{ maxWidth: 760 }}
            onFinish={(values) => mutation.mutate({ ...values, formData: { source: 'admin-web' } })}
          >
            <Form.Item name="title" label="标题" rules={[{ required: true, min: 2 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '权限申请', value: 'permission' },
                  { label: '配置变更', value: 'config' },
                  { label: '数据修复', value: 'data-fix' },
                  { label: '流程支持', value: 'workflow' },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="优先级" initialValue="medium" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                  { label: '紧急', value: 'urgent' },
                ]}
              />
            </Form.Item>
            <Form.Item name="description" label="说明">
              <Input.TextArea rows={6} maxLength={4000} showCount />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                保存草稿
              </Button>
              <Button style={{ marginLeft: 8 }} onClick={backToList}>
                取消
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </>
  );
}
