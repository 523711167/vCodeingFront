import {
  Alert,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Row,
  Space,
  Steps,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';

export interface WorkflowTraceDemoContext {
  workflowInstanceId?: number;
  workflowStatus?: string;
  workflowStatusMsg?: string;
  currentNodeName?: string;
  applicantName?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface WorkflowTraceSummary {
  completedText: string;
  pendingText: string;
  ruleText: string;
  type: 'success' | 'info' | 'error';
}

interface WorkflowTimelineItem {
  color: string;
  comment?: string;
  key: string;
  summary: string;
  time?: string;
  title: string;
  statusText: string;
}

interface WorkflowStructureTaskNode {
  type: 'task';
  key: string;
  title: string;
  owner?: string;
  statusText: string;
  statusColor: string;
  detail?: string;
}

interface WorkflowStructureConditionBranch {
  key: string;
  label: string;
  matched?: boolean;
  nodes: WorkflowStructureNode[];
}

interface WorkflowStructureConditionNode {
  type: 'condition';
  key: string;
  title: string;
  expression: string;
  nodes?: WorkflowStructureNode[];
  branches: WorkflowStructureConditionBranch[];
}

interface WorkflowStructureParallelBranch {
  key: string;
  label: string;
  statusText: string;
  statusColor: string;
  nodes: WorkflowStructureNode[];
}

interface WorkflowStructureParallelNode {
  type: 'parallel';
  key: string;
  title: string;
  ruleText: string;
  nodes?: WorkflowStructureNode[];
  branches: WorkflowStructureParallelBranch[];
}

type WorkflowStructureNode =
  | WorkflowStructureTaskNode
  | WorkflowStructureConditionNode
  | WorkflowStructureParallelNode;

interface WorkflowTraceTimelineProps {
  context?: WorkflowTraceDemoContext | null;
  emptyDescription?: string;
  showOverview?: boolean;
}

function getWorkflowStepStatus(workflowStatus?: string) {
  if (workflowStatus === 'APPROVED') {
    return 'finish';
  }

  if (workflowStatus === 'REJECTED') {
    return 'error';
  }

  return 'process';
}

function getStepCurrentIndex(workflowStatus?: string) {
  if (workflowStatus === 'APPROVED' || workflowStatus === 'REJECTED') {
    return 3;
  }

  return 2;
}

function getTraceSummary(context?: WorkflowTraceDemoContext | null): WorkflowTraceSummary | null {
  if (!context) {
    return null;
  }

  if (context.workflowStatus === 'APPROVED') {
    return {
      completedText:
        '已完成：发起申请、直属领导审批、条件判断、并行组A、技术条件判断、并行组B、汇聚、财务复核、归档',
      pendingText: '当前待处理：无',
      ruleText:
        '复杂规则摘要：金额 > 5000 命中增强链路；并行组A 全部完成后汇聚；技术分支内再次命中嵌套并行组B。',
      type: 'success',
    };
  }

  if (context.workflowStatus === 'REJECTED') {
    return {
      completedText: '已完成：发起申请、直属领导审批、条件判断、人事审批、后勤审批',
      pendingText: '当前阻塞：技术分支内的安全复核拒绝，流程已终止',
      ruleText:
        '复杂规则摘要：流程在技术分支内部命中嵌套并行，安全复核拒绝后，整个主流程停止向后流转。',
      type: 'error',
    };
  }

  return {
    completedText: '已完成：发起申请、直属领导审批、条件判断、人事审批、后勤审批',
    pendingText: '当前待处理：技术部审批分支中的资产开通、系统授权',
    ruleText:
      '复杂规则摘要：主流程先经过条件节点，再进入并行组A；技术分支内部再次命中条件并拆出嵌套并行组B。',
    type: 'info',
  };
}

function getTimelineItems(context?: WorkflowTraceDemoContext | null): WorkflowTimelineItem[] {
  if (!context) {
    return [];
  }

  const applicantName = context.applicantName || '申请人';
  const startedAt = context.startedAt || '-';
  const finishedAt = context.finishedAt || '2026-04-03 11:32:18';
  const workflowStatus = context.workflowStatus || '';

  const items: WorkflowTimelineItem[] = [
    {
      color: 'blue',
      key: 'start',
      statusText: '已发起',
      summary: `${applicantName} 提交了业务申请`,
      time: startedAt,
      title: '发起申请',
    },
    {
      color: 'green',
      comment: '直属领导同意进入复杂审批链路。',
      key: 'manager',
      statusText: '审核通过',
      summary: '直属领导 李四 已审核通过',
      time: '2026-04-03 09:18:07',
      title: '直属领导审批',
    },
    {
      color: 'purple',
      comment: '命中条件：申请金额 > 5000，且涉及设备与权限开通。',
      key: 'condition-amount',
      statusText: '条件命中',
      summary: '流程命中增强审批条件，进入复杂审批路径',
      time: '2026-04-03 09:18:09',
      title: '条件判断：金额与资源类型',
    },
    {
      color: workflowStatus === 'REJECTED' ? 'red' : workflowStatus === 'APPROVED' ? 'green' : 'orange',
      comment:
        workflowStatus === 'APPROVED'
          ? '并行组A 已全部完成，已进入后续财务复核。'
          : workflowStatus === 'REJECTED'
            ? '技术分支内嵌套并行出现拒绝，主并行组A 无法继续汇聚。'
            : '当前人事与后勤已完成，技术分支仍在处理中。',
      key: 'parallel-group-a',
      statusText:
        workflowStatus === 'APPROVED'
          ? '并行已完成'
          : workflowStatus === 'REJECTED'
            ? '并行阻塞'
            : '并行处理中',
      summary:
        '主并行组A：人事审批、后勤审批、技术部审批同时启动，三个分支全部完成后才能汇聚',
      time: '2026-04-03 09:20:12',
      title: '并行组A：部门会签',
    },
    {
      color: 'cyan',
      comment: '技术分支内再次命中“需要权限与资产”条件，因此拆出第二层并行组B。',
      key: 'tech-condition',
      statusText: '条件命中',
      summary: '技术分支内部命中二级条件，进入嵌套并行',
      time: '2026-04-03 09:48:51',
      title: '条件判断：技术资源准备',
    },
    {
      color: workflowStatus === 'APPROVED' ? 'green' : workflowStatus === 'REJECTED' ? 'red' : 'orange',
      comment:
        workflowStatus === 'APPROVED'
          ? '资产开通、安全复核、系统授权三项已全部完成。'
          : workflowStatus === 'REJECTED'
            ? '安全复核拒绝，嵌套并行组B 直接终止。'
            : '当前安全复核已通过，资产开通与系统授权仍处理中。',
      key: 'parallel-group-b',
      statusText:
        workflowStatus === 'APPROVED'
          ? '嵌套并行完成'
          : workflowStatus === 'REJECTED'
            ? '嵌套并行拒绝'
            : '嵌套并行处理中',
      summary:
        '并行组B：资产开通、安全复核、系统授权三个子任务由技术分支继续拆分并行执行',
      time: '2026-04-03 09:49:02',
      title: '并行组B：技术嵌套并行',
    },
  ];

  if (workflowStatus === 'APPROVED') {
    items.push(
      {
        color: 'green',
        comment: '主并行组A 与嵌套并行组B 均完成后，流程进入汇聚节点。',
        key: 'merge',
        statusText: '汇聚完成',
        summary: '所有主分支与嵌套分支都已完成，流程放行到后续节点',
        time: '2026-04-03 11:16:30',
        title: '并行汇聚',
      },
      {
        color: 'green',
        key: 'finance-review',
        statusText: '审核通过',
        summary: '财务复核已完成，流程进入归档',
        time: '2026-04-03 11:24:16',
        title: '财务复核',
      },
      {
        color: 'green',
        key: 'archive',
        statusText: '流程结束',
        summary: '单据已归档，复杂审批链路全部完成',
        time: finishedAt,
        title: '归档结束',
      },
    );
    return items;
  }

  if (workflowStatus === 'REJECTED') {
    items.push(
      {
        color: 'red',
        comment: '拒绝发生在技术分支内的嵌套并行，因此无需再等待其它未完成分支。',
        key: 'merge-stop',
        statusText: '汇聚终止',
        summary: '复杂链路在二级分支内部被拒绝，主流程停止',
        time: finishedAt,
        title: '并行汇聚',
      },
      {
        color: 'red',
        key: 'finish',
        statusText: '流程结束',
        summary: '流程已终止，需发起人修改后重新提交',
        time: finishedAt,
        title: '结束',
      },
    );
    return items;
  }

  items.push({
    color: 'orange',
    comment: '当前主流程卡在技术分支内部的嵌套并行组B，尚未满足汇聚条件。',
    key: 'merge-wait',
    statusText: '等待汇聚',
    summary: '主并行组A 正在等待技术分支内的二级并行任务完成',
    time: '2026-04-03 10:58:44',
    title: '并行汇聚',
  });

  return items;
}

function getStructureNodes(context?: WorkflowTraceDemoContext | null): WorkflowStructureNode[] {
  if (!context) {
    return [];
  }

  const workflowStatus = context.workflowStatus || '';

  return [
    {
      detail: '申请人提交业务单据与表单快照',
      key: 'node-start',
      owner: context.applicantName || '申请人',
      statusColor: 'green',
      statusText: '已执行',
      title: '节点1：发起申请',
      type: 'task',
    },
    {
      detail: '直属领导审批通过后才能继续',
      key: 'node-manager',
      owner: '李四',
      statusColor: 'green',
      statusText: '已执行',
      title: '节点2：直属领导审批',
      type: 'task',
    },
    {
      branches: [
        {
          key: 'branch-high-amount',
          label: '命中分支：金额 > 5000 且涉及设备/权限',
          matched: true,
          nodes: [
            {
              branches: [
                {
                  key: 'parallel-branch-hr',
                  label: '分支A1：人事审批',
                  nodes: [
                    {
                      detail: '人事核验人员信息与流程归属',
                      key: 'node-hr',
                      owner: '王敏',
                      statusColor: 'green',
                      statusText: '已执行',
                      title: '节点4：人事审批',
                      type: 'task',
                    },
                  ],
                  statusColor: 'green',
                  statusText: '已完成',
                },
                {
                  key: 'parallel-branch-logistics',
                  label: '分支A2：后勤审批',
                  nodes: [
                    {
                      detail: '后勤确认工位、门禁、会议室等资源',
                      key: 'node-logistics',
                      owner: '赵强',
                      statusColor: workflowStatus === 'APPROVED' ? 'green' : 'orange',
                      statusText: workflowStatus === 'APPROVED' ? '已执行' : '处理中',
                      title: '节点5：后勤审批',
                      type: 'task',
                    },
                  ],
                  statusColor: workflowStatus === 'APPROVED' ? 'green' : 'orange',
                  statusText: workflowStatus === 'APPROVED' ? '已完成' : '进行中',
                },
                {
                  key: 'parallel-branch-tech',
                  label: '分支A3：技术部审批',
                  nodes: [
                    {
                      detail: '技术主管确认是否需要继续走资源开通链路',
                      key: 'node-tech-review',
                      owner: '陈工',
                      statusColor: 'green',
                      statusText: '已执行',
                      title: '节点6：技术部审批',
                      type: 'task',
                    },
                    {
                      branches: [
                        {
                          key: 'branch-tech-yes',
                          label: '命中分支：需要系统权限 + 设备资产',
                          matched: true,
                          nodes: [
                            {
                              branches: [
                                {
                                  key: 'parallel-b-asset',
                                  label: '分支B1：资产开通',
                                  nodes: [
                                    {
                                      detail: '登记电脑、外设、序列号',
                                      key: 'node-asset',
                                      owner: '资产管理员',
                                      statusColor: workflowStatus === 'APPROVED' ? 'green' : 'orange',
                                      statusText: workflowStatus === 'APPROVED' ? '已执行' : '处理中',
                                      title: '节点8：资产开通',
                                      type: 'task',
                                    },
                                  ],
                                  statusColor: workflowStatus === 'APPROVED' ? 'green' : 'orange',
                                  statusText: workflowStatus === 'APPROVED' ? '已完成' : '进行中',
                                },
                                {
                                  key: 'parallel-b-security',
                                  label: '分支B2：安全复核',
                                  nodes: [
                                    {
                                      detail:
                                        workflowStatus === 'REJECTED'
                                          ? '安全策略不满足要求，拒绝发放权限'
                                          : '安全策略已核验',
                                      key: 'node-security',
                                      owner: '安全管理员',
                                      statusColor:
                                        workflowStatus === 'REJECTED' ? 'red' : 'green',
                                      statusText:
                                        workflowStatus === 'REJECTED' ? '已拒绝' : '已执行',
                                      title: '节点9：安全复核',
                                      type: 'task',
                                    },
                                  ],
                                  statusColor:
                                    workflowStatus === 'REJECTED' ? 'red' : 'green',
                                  statusText:
                                    workflowStatus === 'REJECTED' ? '拒绝' : '已完成',
                                },
                                {
                                  key: 'parallel-b-system',
                                  label: '分支B3：系统授权',
                                  nodes: [
                                    {
                                      detail: '开通 VPN、代码仓、内部系统角色',
                                      key: 'node-system',
                                      owner: '系统管理员',
                                      statusColor:
                                        workflowStatus === 'APPROVED' ? 'green' : 'orange',
                                      statusText:
                                        workflowStatus === 'APPROVED' ? '已执行' : '待执行',
                                      title: '节点10：系统授权',
                                      type: 'task',
                                    },
                                  ],
                                  statusColor:
                                    workflowStatus === 'APPROVED' ? 'green' : 'default',
                                  statusText:
                                    workflowStatus === 'APPROVED' ? '已完成' : '待处理',
                                },
                              ],
                              key: 'parallel-group-b',
                              ruleText: '并行组B 规则：资产开通、安全复核、系统授权三项全部完成后才允许技术分支放行',
                              title: '节点7：并行组B（技术嵌套并行）',
                              type: 'parallel',
                            },
                          ],
                        },
                        {
                          key: 'branch-tech-no',
                          label: '未命中分支：无需资源开通，直接结束技术分支',
                          matched: false,
                          nodes: [],
                        },
                      ],
                      expression: '是否需要系统权限或设备资产',
                      key: 'node-tech-condition',
                      title: '节点7：技术资源条件判断',
                      type: 'condition',
                    },
                  ],
                  statusColor:
                    workflowStatus === 'REJECTED'
                      ? 'red'
                      : workflowStatus === 'APPROVED'
                        ? 'green'
                        : 'orange',
                  statusText:
                    workflowStatus === 'REJECTED'
                      ? '拒绝'
                      : workflowStatus === 'APPROVED'
                        ? '已完成'
                        : '进行中',
                },
              ],
              key: 'parallel-group-a',
              ruleText: '并行组A 规则：人事、后勤、技术三个主分支全部完成后才能汇聚',
              title: '节点4-10：并行组A（部门主并行）',
              type: 'parallel',
            },
            {
              detail:
                workflowStatus === 'APPROVED'
                  ? '所有分支已完成，进入财务复核'
                  : workflowStatus === 'REJECTED'
                    ? '分支拒绝导致主流程终止'
                    : '等待技术分支中的嵌套并行完成',
              key: 'node-merge',
              owner: '系统自动汇聚',
              statusColor:
                workflowStatus === 'APPROVED'
                  ? 'green'
                  : workflowStatus === 'REJECTED'
                    ? 'red'
                    : 'orange',
              statusText:
                workflowStatus === 'APPROVED'
                  ? '已执行'
                  : workflowStatus === 'REJECTED'
                    ? '已终止'
                    : '等待中',
              title: '节点11：并行汇聚',
              type: 'task',
            },
            {
              detail:
                workflowStatus === 'APPROVED'
                  ? '财务已复核完成'
                  : workflowStatus === 'REJECTED'
                    ? '未进入'
                    : '尚未进入该节点',
              key: 'node-finance',
              owner: '财务经理',
              statusColor:
                workflowStatus === 'APPROVED'
                  ? 'green'
                  : workflowStatus === 'REJECTED'
                    ? 'default'
                    : 'default',
              statusText:
                workflowStatus === 'APPROVED' ? '已执行' : '未执行',
              title: '节点12：财务复核',
              type: 'task',
            },
          ],
        },
        {
          key: 'branch-low-amount',
          label: '未命中分支：金额 <= 5000，走简化审批链路',
          matched: false,
          nodes: [],
        },
      ],
      expression: '申请金额 > 5000 且包含设备/权限需求',
      key: 'node-main-condition',
      title: '节点3：主条件判断',
      type: 'condition',
    },
  ];
}

function renderTaskNode(node: WorkflowStructureTaskNode) {
  return (
    <Card size="small">
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <Typography.Text strong>{node.title}</Typography.Text>
          <Tag color={node.statusColor}>{node.statusText}</Tag>
        </div>
        <Typography.Text type="secondary">
          处理人：{node.owner || '-'}
        </Typography.Text>
        {node.detail && (
          <Typography.Text type="secondary">{node.detail}</Typography.Text>
        )}
      </Space>
    </Card>
  );
}

function renderStructureNode(node: WorkflowStructureNode, depth = 0): ReactNode {
  const wrapperStyle = {
    borderLeft: depth > 0 ? '2px solid #f0f0f0' : 'none',
    marginLeft: depth > 0 ? 12 : 0,
    paddingLeft: depth > 0 ? 12 : 0,
  };

  if (node.type === 'task') {
    return (
      <div key={node.key} style={wrapperStyle}>
        {renderTaskNode(node)}
      </div>
    );
  }

  if (node.type === 'condition') {
    return (
      <div key={node.key} style={wrapperStyle}>
        <Card
          size="small"
          style={{ background: '#fafafa' }}
          title={
            <Space size={8}>
              <Typography.Text strong>{node.title}</Typography.Text>
              <Tag color="purple">条件节点</Tag>
            </Space>
          }
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text type="secondary">
              判断表达式：{node.expression}
            </Typography.Text>
            {node.nodes?.map((currentNode) => renderStructureNode(currentNode, depth + 1))}
            {node.branches.map((branch) => (
              <Card
                key={branch.key}
                size="small"
                title={
                  <Space size={8}>
                    <Typography.Text>{branch.label}</Typography.Text>
                    <Tag color={branch.matched ? 'green' : 'default'}>
                      {branch.matched ? '已命中' : '未命中'}
                    </Tag>
                  </Space>
                }
              >
                {branch.nodes.length > 0 ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {branch.nodes.map((currentNode) =>
                      renderStructureNode(currentNode, depth + 1),
                    )}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">该分支本次未执行</Typography.Text>
                )}
              </Card>
            ))}
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div key={node.key} style={wrapperStyle}>
      <Card
        size="small"
        style={{ background: '#fffdf6' }}
        title={
          <Space size={8}>
            <Typography.Text strong>{node.title}</Typography.Text>
            <Tag color="geekblue">并行组</Tag>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {node.nodes?.map((currentNode) => renderStructureNode(currentNode, depth + 1))}
          <Alert
            message="并行规则"
            showIcon
            type="info"
            description={node.ruleText}
          />
          <Row gutter={[12, 12]}>
            {node.branches.map((branch) => (
              <Col key={branch.key} span={24} xl={8}>
                <Card
                  size="small"
                  title={
                    <Space size={8}>
                      <Typography.Text>{branch.label}</Typography.Text>
                      <Tag color={branch.statusColor}>{branch.statusText}</Tag>
                    </Space>
                  }
                  styles={{
                    body: {
                      minHeight: 120,
                    },
                  }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {branch.nodes.map((currentNode) =>
                      renderStructureNode(currentNode, depth + 1),
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>
    </div>
  );
}

function WorkflowTraceTimeline({
  context,
  emptyDescription = '暂无流程轨迹',
  showOverview = true,
}: WorkflowTraceTimelineProps) {
  const traceItems = getTimelineItems(context);
  const traceSummary = getTraceSummary(context);
  const structureNodes = getStructureNodes(context);

  if (!context) {
    return (
      <Card title="流程轨迹">
        <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card title="流程轨迹">
      {showOverview && (
        <Descriptions
          column={2}
          items={[
            {
              key: 'workflowInstanceId',
              label: '流程实例ID',
              children: context.workflowInstanceId ?? '-',
            },
            {
              key: 'workflowStatus',
              label: '流程状态',
              children: context.workflowStatusMsg || context.workflowStatus || '-',
            },
            {
              key: 'applicantName',
              label: '发起人',
              children: context.applicantName || '-',
            },
            {
              key: 'currentNodeName',
              label: '当前节点',
              children: context.currentNodeName || '并行组B：技术嵌套并行',
            },
            {
              key: 'startedAt',
              label: '发起时间',
              children: context.startedAt || '-',
            },
            {
              key: 'finishedAt',
              label: '结束时间',
              children: context.finishedAt || '-',
            },
          ]}
          size="small"
          style={{ marginBottom: 20 }}
        />
      )}

      {traceSummary && (
        <Alert
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text>{traceSummary.completedText}</Typography.Text>
              <Typography.Text>{traceSummary.pendingText}</Typography.Text>
              <Typography.Text type="secondary">{traceSummary.ruleText}</Typography.Text>
            </Space>
          }
          message="流程摘要"
          showIcon
          style={{ marginBottom: 16 }}
          type={traceSummary.type}
        />
      )}

      {/* 复杂流程下不能只给一条时间线，否则条件节点和嵌套并行会丢失结构信息。
          这里把视图拆成“阶段总览 / 实际执行轨迹 / 结构视图”，分别回答进度、路径和全貌。 */}
      <Card
        size="small"
        style={{ background: '#fafafa', marginBottom: 16 }}
        title="流程阶段总览"
      >
        <Steps
          current={getStepCurrentIndex(context.workflowStatus)}
          items={[
            {
              description: '发起人与直属领导审批',
              status: 'finish',
              title: '基础审批',
            },
            {
              description: '命中条件后进入主并行组A',
              status: 'finish',
              title: '条件分流',
            },
            {
              description: '技术分支内再次拆出嵌套并行组B',
              status: getWorkflowStepStatus(context.workflowStatus),
              title: '嵌套并行',
            },
            {
              description:
                context.workflowStatus === 'APPROVED'
                  ? '流程汇聚完成并归档'
                  : context.workflowStatus === 'REJECTED'
                    ? '流程在复杂分支中终止'
                    : '等待所有复杂分支满足汇聚条件',
              status:
                context.workflowStatus === 'APPROVED'
                  ? 'finish'
                  : context.workflowStatus === 'REJECTED'
                    ? 'error'
                    : 'wait',
              title: '汇聚结束',
            },
          ]}
          responsive
          size="small"
        />
      </Card>

      <Collapse
        defaultActiveKey={['runtime', 'structure']}
        items={[
          {
            key: 'runtime',
            label: '执行轨迹视图',
            children: (
              <Timeline
                items={traceItems.map((item) => ({
                  children: (
                    <div style={{ paddingBottom: 8 }}>
                      <div
                        style={{
                          alignItems: 'center',
                          display: 'flex',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Tag color={item.color}>{item.statusText}</Tag>
                      </div>
                      <Typography.Paragraph style={{ marginBottom: 6 }}>
                        {item.summary}
                      </Typography.Paragraph>
                      {item.comment && (
                        <Typography.Paragraph
                          style={{ color: 'rgba(0, 0, 0, 0.65)', marginBottom: 6 }}
                        >
                          说明：{item.comment}
                        </Typography.Paragraph>
                      )}
                      <Typography.Text type="secondary">
                        时间：{item.time || '-'}
                      </Typography.Text>
                    </div>
                  ),
                  color: item.color,
                }))}
              />
            ),
          },
          {
            key: 'structure',
            label: '结构视图（含条件节点、并行拆分、嵌套并行）',
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {structureNodes.map((node) => renderStructureNode(node))}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default WorkflowTraceTimeline;
