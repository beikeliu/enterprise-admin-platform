import { Descriptions, Space, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { WorkflowGraph } from '@/components/workflow/WorkflowGraph';
import { api } from '@/lib/api';
import { tableScroll } from '@/lib/table-scroll';

type WorkflowTemplateRow = {
  id: string;
  name: string;
  code: string;
  resourceType: string;
  version: number;
  status: string;
  nodeCount: number;
  edgeCount: number;
  instanceCount: number;
  nodes: Array<{ id: string; nodeKey: string; nodeType: string; name: string; assigneeType?: string }>;
  edges: Array<{ id: string; sourceNodeKey: string; targetNodeKey: string }>;
  updatedAt: string;
};

const nodeTypeColor: Record<string, string> = {
  start: 'cyan',
  approval: 'blue',
  notify: 'gold',
  end: 'green',
};

export function WorkflowTemplatesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['workflow-templates'], queryFn: api.workflowTemplates });

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">流程模板</h1>
          <div className="page-subtitle">查看业务流程模板、节点配置、流转关系和实例使用情况。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            scroll={tableScroll()}
            expandable={{
              expandedRowRender: (record: WorkflowTemplateRow) => (
                <div className="workflow-template-detail">
                  <WorkflowGraph nodes={record.nodes} edges={record.edges} height={300} />
                  <Descriptions size="small" column={4} bordered>
                    <Descriptions.Item label="节点数">{record.nodeCount}</Descriptions.Item>
                    <Descriptions.Item label="连线数">{record.edgeCount}</Descriptions.Item>
                    <Descriptions.Item label="实例数">{record.instanceCount}</Descriptions.Item>
                    <Descriptions.Item label="资源">{record.resourceType}</Descriptions.Item>
                    <Descriptions.Item label="节点配置" span={4}>
                      <Space wrap>
                        {record.nodes.map((node) => (
                          <Tag key={node.id} color={nodeTypeColor[node.nodeType] ?? 'default'}>
                            {node.name} / {node.nodeType} / {node.assigneeType ?? '-'}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            }}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '编码', dataIndex: 'code', width: 170 },
              { title: '资源', dataIndex: 'resourceType', width: 110 },
              { title: '版本', dataIndex: 'version', width: 80 },
              { title: '节点数', dataIndex: 'nodeCount', width: 90 },
              { title: '连线数', dataIndex: 'edgeCount', width: 90 },
              { title: '实例数', dataIndex: 'instanceCount', width: 90 },
              { title: '状态', dataIndex: 'status', width: 120, render: (value) => <Tag color={value === 'published' ? 'success' : 'default'}>{value}</Tag> },
              { title: '更新时间', dataIndex: 'updatedAt', width: 230 },
            ]}
          />
        </div>
      </div>
    </>
  );
}
