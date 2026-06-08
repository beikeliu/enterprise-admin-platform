import { Input, Space, Switch, Table, Tag, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type FeatureFlagRow = {
  id: string;
  name: string;
  code: string;
  description?: string;
  enabled: boolean;
  updatedAt: string;
};

export function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: api.featureFlags });
  const mutation = useMutation({
    mutationFn: ({ id, enabled, description }: { id: string; enabled: boolean; description?: string }) =>
      api.updateFeatureFlag(id, { enabled, description }),
    onSuccess: () => {
      message.success('功能开关已更新');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">功能开关</h1>
          <div className="page-subtitle">控制灰度能力、实验功能和业务开关。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            scroll={tableScroll()}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '编码', dataIndex: 'code', width: 190 },
              {
                title: '状态',
                dataIndex: 'enabled',
                width: 120,
                render: (value, record: FeatureFlagRow) => (
                  <Switch
                    checked={value}
                    checkedChildren="开"
                    unCheckedChildren="关"
                    onChange={(enabled) => mutation.mutate({ id: record.id, enabled, description: record.description })}
                  />
                ),
              },
              {
                title: '说明',
                dataIndex: 'description',
                render: (value, record: FeatureFlagRow) => (
                  <Space>
                    <Input
                      defaultValue={value}
                      style={{ width: 360 }}
                      onPressEnter={(event) =>
                        mutation.mutate({
                          id: record.id,
                          enabled: record.enabled,
                          description: event.currentTarget.value,
                        })
                      }
                    />
                    <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? 'enabled' : 'disabled'}</Tag>
                  </Space>
                ),
              },
              { title: '更新时间', dataIndex: 'updatedAt', width: 230 },
            ]}
          />
        </div>
      </div>
    </>
  );
}
