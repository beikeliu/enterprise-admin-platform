import { Bar, Gauge } from '@ant-design/plots';
import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const formatBytes = (value: number) => {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export function SystemMonitorPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-monitor'],
    queryFn: api.systemMonitor,
    refetchInterval: 30000,
  });
  const heapRate = data?.memory.heapTotal ? data.memory.heapUsed / data.memory.heapTotal : 0;

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">系统监控</h1>
          <div className="page-subtitle">观测 API 服务、数据库响应、内存占用和关键模块规模。</div>
        </div>
      </div>
      <div className="metric-grid">
        <Metric label="API 状态" value={data?.service.status ?? '-'} tone="green" />
        <Metric label="数据库延迟" value={`${data?.database.latencyMs ?? 0}ms`} tone="blue" />
        <Metric label="运行时长" value={formatDuration(data?.service.uptimeSeconds ?? 0)} tone="cyan" />
        <Metric label="RSS 内存" value={formatBytes(data?.memory.rss ?? 0)} tone="amber" />
      </div>
      <div className="chart-grid chart-grid-large">
        <section className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>堆内存使用率</h3>
              <p>Node.js heap used / heap total</p>
            </div>
          </div>
          <div className="chart-card-body">
            <Gauge
              percent={heapRate}
              height={280}
              range={{ color: ['#14b8a6', '#f59e0b', '#ef4444'] }}
              indicator={{ pointer: { style: { stroke: '#172033' } } }}
            />
          </div>
        </section>
        <section className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>模块规模</h3>
              <p>平台核心对象计数</p>
            </div>
          </div>
          <div className="chart-card-body">
            <Bar data={data?.modules ?? []} xField="value" yField="name" height={280} colorField="name" />
          </div>
        </section>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            title={() => '最近审计活动'}
            dataSource={data?.recentAuditLogs ?? []}
            pagination={false}
            columns={[
              { title: '动作', dataIndex: 'action', width: 180, render: (value) => <Tag color="processing">{value}</Tag> },
              { title: '资源', dataIndex: 'resource', width: 140 },
              { title: '操作者', dataIndex: 'actorName', width: 140 },
              { title: 'Trace ID', dataIndex: 'traceId', ellipsis: true },
              { title: '时间', dataIndex: 'createdAt', width: 230 },
            ]}
          />
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
