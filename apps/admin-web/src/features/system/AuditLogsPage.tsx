import { Input, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type AuditLogRow = {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  actorName: string;
  detail?: unknown;
  traceId: string;
  createdAt: string;
};

export function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', keyword],
    queryFn: () => api.auditLogs(new URLSearchParams({ page: '1', pageSize: '20', keyword }).toString()),
  });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">审计日志</h1>
          <div className="page-subtitle">追踪关键操作、资源变更和请求链路。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Input.Search
            allowClear
            placeholder="搜索动作、资源或资源 ID"
            defaultValue={keyword}
            style={{ width: 360, marginBottom: 16 }}
            onSearch={(value) => setSearchParams(value ? { keyword: value } : {})}
          />
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={((data as { items?: AuditLogRow[] } | undefined)?.items ?? [])}
            scroll={tableScroll()}
            expandable={{
              expandedRowRender: (record) => (
                <Typography.Text code style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(record.detail ?? {}, null, 2)}
                </Typography.Text>
              ),
            }}
            columns={[
              { title: '动作', dataIndex: 'action', width: 170, render: (value) => <Tag color="processing">{value}</Tag> },
              { title: '资源', dataIndex: 'resource', width: 120 },
              { title: '资源 ID', dataIndex: 'resourceId', ellipsis: true },
              { title: '操作者', dataIndex: 'actorName', width: 130 },
              { title: 'Trace ID', dataIndex: 'traceId', ellipsis: true },
              { title: '时间', dataIndex: 'createdAt', width: 230 },
            ]}
          />
        </div>
      </div>
    </>
  );
}
