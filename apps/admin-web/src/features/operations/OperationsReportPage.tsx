import { Bar, Column, Line, Pie } from '@ant-design/plots';
import { Progress, Space, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { compactTableScroll } from '@/lib/table-scroll';

type DistributionRow = {
  name: string;
  value: number;
};

const statusLabel: Record<string, string> = {
  draft: '草稿',
  approving: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  closed: '已关闭',
};

const priorityLabel: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const statusColor = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#64748b'];
const priorityColor = ['#22c55e', '#2563eb', '#f59e0b', '#ef4444'];

export function OperationsReportPage() {
  const { data, isLoading } = useQuery({ queryKey: ['operation-report'], queryFn: api.operationReport });
  const metrics = data?.metrics;
  const ticketTotal = metrics?.ticketTotal ?? 0;
  const approvedRate = ticketTotal ? Math.round(((metrics?.approvedTickets ?? 0) / ticketTotal) * 100) : 0;
  const activityScore = Math.min(100, Math.round(((metrics?.auditLogs ?? 0) / Math.max(ticketTotal, 1)) * 25));

  const statusData = (data?.ticketStatus ?? []).map((item) => ({ ...item, name: statusLabel[item.name] ?? item.name }));
  const priorityData = (data?.ticketPriority ?? []).map((item) => ({ ...item, name: priorityLabel[item.name] ?? item.name }));

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">报表中心</h1>
          <div className="page-subtitle">沉淀运营规模、审批效率、系统活动和资源占用。</div>
        </div>
      </div>
      <section className="ops-hero">
        <div>
          <div className="ops-hero-label">Operations Intelligence</div>
          <h2>企业运营健康度</h2>
          <p>通过工单流转、审计活跃、文件资产和通知触达衡量平台运行状态。</p>
        </div>
        <div className="ops-hero-gauges">
          <div>
            <span>审批通过率</span>
            <strong>{approvedRate}%</strong>
            <Progress percent={approvedRate} showInfo={false} strokeColor="#14b8a6" />
          </div>
          <div>
            <span>活动强度</span>
            <strong>{activityScore}%</strong>
            <Progress percent={activityScore} showInfo={false} strokeColor="#2563eb" />
          </div>
        </div>
      </section>
      <div className="metric-grid">
        <Metric label="工单总数" value={metrics?.ticketTotal ?? 0} tone="blue" />
        <Metric label="审批中" value={metrics?.approvingTickets ?? 0} tone="amber" />
        <Metric label="系统用户" value={metrics?.users ?? 0} tone="green" />
        <Metric label="审计日志" value={metrics?.auditLogs ?? 0} tone="slate" />
      </div>
      <div className="metric-grid">
        <Metric label="文件资产" value={metrics?.files ?? 0} tone="violet" />
        <Metric label="通知消息" value={metrics?.notifications ?? 0} tone="cyan" />
        <Metric label="已通过工单" value={metrics?.approvedTickets ?? 0} tone="green" />
        <Metric label="通过率" value={`${approvedRate}%`} tone="blue" />
      </div>
      <div className="chart-grid chart-grid-large">
        <ChartCard title="14 天工单趋势" subtitle="新建与通过工单的日维度走势">
          <Line
            data={data?.ticketTrend ?? []}
            xField="date"
            yField="value"
            colorField="type"
            height={280}
            smooth
            point={{ size: 3 }}
          />
        </ChartCard>
        <ChartCard title="审计活跃趋势" subtitle="反映系统操作密度和治理留痕">
          <Column data={data?.auditTrend ?? []} xField="date" yField="count" height={280} colorField="date" />
        </ChartCard>
      </div>
      <div className="chart-grid">
        <ChartCard title="工单状态分布" subtitle="按当前流转状态聚合">
          <Pie
            data={statusData}
            angleField="value"
            colorField="name"
            height={260}
            radius={0.86}
            innerRadius={0.58}
            scale={{ color: { range: statusColor } }}
          />
        </ChartCard>
        <ChartCard title="优先级分布" subtitle="识别高风险事项占比">
          <Pie
            data={priorityData}
            angleField="value"
            colorField="name"
            height={260}
            radius={0.86}
            innerRadius={0.58}
            scale={{ color: { range: priorityColor } }}
          />
        </ChartCard>
        <ChartCard title="部门工单排行" subtitle="按承载工单量排序">
          <Bar data={data?.departmentRanking ?? []} xField="value" yField="name" height={260} colorField="name" />
        </ChartCard>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Space align="start" size={24} style={{ width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Table
                rowKey="name"
                title={() => '工单状态明细'}
                loading={isLoading}
                dataSource={data?.ticketStatus ?? []}
                scroll={compactTableScroll}
                pagination={false}
                columns={[
                  {
                    title: '状态',
                    dataIndex: 'name',
                    render: (value) => <Tag>{statusLabel[value] ?? value}</Tag>,
                  },
                  { title: '数量', dataIndex: 'value', width: 100 },
                  {
                    title: '占比',
                    render: (_, record: DistributionRow) => (
                      <Progress percent={ticketTotal ? Math.round((record.value / ticketTotal) * 100) : 0} size="small" />
                    ),
                  },
                ]}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Table
                rowKey="name"
                title={() => '申请人排行'}
                loading={isLoading}
                dataSource={data?.applicantRanking ?? []}
                scroll={compactTableScroll}
                pagination={false}
                columns={[
                  { title: '申请人', dataIndex: 'name' },
                  { title: '工单数', dataIndex: 'value', width: 100 },
                  {
                    title: '占比',
                    render: (_, record: DistributionRow) => (
                      <Progress percent={ticketTotal ? Math.round((record.value / ticketTotal) * 100) : 0} size="small" />
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </div>
      </div>
    </>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
    </section>
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
