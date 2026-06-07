import { Area, Pie } from '@ant-design/plots';
import { Button, List, Space, Table, Tag, Typography } from 'antd';
import { ArrowRight, Bell, FileText, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

const statusColor: Record<string, string> = {
  draft: 'default',
  approving: 'processing',
  approved: 'success',
  rejected: 'error',
  closed: 'default',
};

const statusLabel: Record<string, string> = {
  draft: '草稿',
  approving: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  closed: '已关闭',
};

export function DashboardPage() {
  const { data: ticketData } = useQuery({ queryKey: ['tickets', 'dashboard'], queryFn: () => api.tickets('page=1&pageSize=5') });
  const { data: reportData } = useQuery({ queryKey: ['operation-report'], queryFn: api.operationReport });
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications });

  const metrics = reportData?.metrics;
  const statusData = (reportData?.ticketStatus ?? []).map((item) => ({ ...item, name: statusLabel[item.name] ?? item.name }));
  const unreadNotifications = notifications?.items.filter((item) => !item.readAt).slice(0, 4) ?? [];
  const approvedRate = metrics?.ticketTotal ? Math.round((metrics.approvedTickets / metrics.ticketTotal) * 100) : 0;

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <div className="ops-hero-label">Command Center</div>
          <h1>运营仪表盘</h1>
          <p>聚合工单、审批、通知、文件和审计信号，快速判断企业运营健康状态。</p>
        </div>
        <div className="dashboard-hero-actions">
          <Button type="primary" icon={<ArrowRight size={16} />}>
            <Link to="/reports/operations">查看报表</Link>
          </Button>
          <Button icon={<Bell size={16} />}>
            <Link to="/notifications">通知中心</Link>
          </Button>
        </div>
      </section>
      <div className="metric-grid">
        <Metric label="工单总数" value={metrics?.ticketTotal ?? ticketData?.total ?? 0} tone="blue" />
        <Metric label="审批中" value={metrics?.approvingTickets ?? 0} tone="amber" />
        <Metric label="审批通过率" value={`${approvedRate}%`} tone="green" />
        <Metric label="未读通知" value={notifications?.items.filter((item) => !item.readAt).length ?? 0} tone="cyan" />
      </div>
      <div className="chart-grid chart-grid-large">
        <section className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>14 天工单流转</h3>
              <p>新建与通过数量趋势</p>
            </div>
          </div>
          <div className="chart-card-body">
            <Area
              data={reportData?.ticketTrend ?? []}
              xField="date"
              yField="value"
              colorField="type"
              height={280}
              shapeField="smooth"
            />
          </div>
        </section>
        <section className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3>状态分布</h3>
              <p>当前工单池结构</p>
            </div>
          </div>
          <div className="chart-card-body">
            <Pie
              data={statusData}
              angleField="value"
              colorField="name"
              height={280}
              radius={0.86}
              innerRadius={0.6}
              scale={{ color: { range: ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#64748b'] } }}
            />
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-body">
            <Table
              rowKey="id"
              title={() => '最近工单'}
              dataSource={ticketData?.items ?? []}
              pagination={false}
              columns={[
                { title: '标题', dataIndex: 'title', render: (value, record) => <Link to={`/tickets/${record.id}`}>{value}</Link> },
                { title: '申请人', dataIndex: 'applicantName', width: 120 },
                { title: '状态', dataIndex: 'status', width: 120, render: (value) => <Tag color={statusColor[value] ?? 'default'}>{value}</Tag> },
                { title: '优先级', dataIndex: 'priority', width: 120 },
              ]}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-body">
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <Insight icon={<ShieldCheck size={18} />} label="审计日志" value={metrics?.auditLogs ?? 0} to="/audit/logs" />
              <Insight icon={<FileText size={18} />} label="文件资产" value={metrics?.files ?? 0} to="/files" />
              <div>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  未读通知
                </Typography.Title>
                <List
                  size="small"
                  dataSource={unreadNotifications}
                  locale={{ emptyText: '暂无未读通知' }}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta title={item.title} description={item.content} />
                    </List.Item>
                  )}
                />
              </div>
            </Space>
          </div>
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

function Insight({ icon, label, value, to }: { icon: ReactNode; label: string; value: number; to: string }) {
  return (
    <Link className="insight-row" to={to}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <em>{value}</em>
    </Link>
  );
}
