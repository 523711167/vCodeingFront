import { useEffect, useRef, useState } from 'react';
import { App as AntdApp, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/dist/index.css';
import PageContainer from '@/components/PageContainer';

// 初始流程图只保留“开始 -> 审批 -> 抄送 -> 结束”四个节点。
// 这样做是为了先把流程定义页的最小交互打通，后续再替换成真实流程定义接口返回的数据。
const initialGraphData = {
  nodes: [
    {
      id: 'start-node',
      type: 'circle',
      x: 120,
      y: 220,
      text: '开始',
    },
    {
      id: 'approve-node',
      type: 'rect',
      x: 320,
      y: 220,
      text: '直属领导审批',
    },
    {
      id: 'copy-node',
      type: 'rect',
      x: 540,
      y: 220,
      text: '抄送归档',
    },
    {
      id: 'end-node',
      type: 'circle',
      x: 760,
      y: 220,
      text: '结束',
    },
  ],
  edges: [
    {
      id: 'edge-start-approve',
      sourceNodeId: 'start-node',
      targetNodeId: 'approve-node',
      type: 'polyline',
      text: '提交申请',
    },
    {
      id: 'edge-approve-copy',
      sourceNodeId: 'approve-node',
      targetNodeId: 'copy-node',
      type: 'polyline',
      text: '审批通过',
    },
    {
      id: 'edge-copy-end',
      sourceNodeId: 'copy-node',
      targetNodeId: 'end-node',
      type: 'polyline',
    },
  ],
};

function ProcessDefinitionPage() {
  const { message } = AntdApp.useApp();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const logicFlowRef = useRef<LogicFlow | null>(null);
  const nodeSequenceRef = useRef(initialGraphData.nodes.length + 1);
  const [graphSnapshot, setGraphSnapshot] = useState(
    JSON.stringify(initialGraphData, null, 2),
  );

  function syncGraphSnapshot() {
    const currentGraphData = logicFlowRef.current?.getGraphData();

    setGraphSnapshot(JSON.stringify(currentGraphData ?? initialGraphData, null, 2));
  }

  useEffect(() => {
    if (!canvasRef.current || logicFlowRef.current) {
      return;
    }

    // LogicFlow 实例只在页面挂载时初始化一次。
    // 后续如果要扩展自定义节点、属性面板或工具栏，都优先从这里继续挂载插件和事件。
    const logicFlow = new LogicFlow({
      container: canvasRef.current,
      edgeType: 'polyline',
      grid: {
        size: 10,
        visible: true,
      },
      height: 560,
      snapline: true,
      width: canvasRef.current.clientWidth || 960,
    });

    logicFlowRef.current = logicFlow;
    logicFlow.render(initialGraphData);
    logicFlow.fitView(40, 40);
    syncGraphSnapshot();

    // 这里统一监听画布变更，是为了让右侧 JSON 预览始终反映最新的拖拽、连线和删除结果。
    logicFlow.on('history:change', syncGraphSnapshot);
    logicFlow.on('graph:rendered', syncGraphSnapshot);

    return () => {
      logicFlow.destroy();
      logicFlowRef.current = null;
    };
  }, []);

  function addRectNode() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    const nextIndex = nodeSequenceRef.current++;

    logicFlow.addNode({
      id: `approve-node-${nextIndex}`,
      type: 'rect',
      x: 220 + nextIndex * 24,
      y: 120 + (nextIndex % 4) * 70,
      text: `审批节点${nextIndex}`,
    });
    message.success('已新增审批节点');
    syncGraphSnapshot();
  }

  function addDiamondNode() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    const nextIndex = nodeSequenceRef.current++;

    logicFlow.addNode({
      id: `condition-node-${nextIndex}`,
      type: 'diamond',
      x: 260 + nextIndex * 18,
      y: 150 + (nextIndex % 3) * 80,
      text: `条件${nextIndex}`,
    });
    message.success('已新增条件节点');
    syncGraphSnapshot();
  }

  function resetDemoGraph() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    nodeSequenceRef.current = initialGraphData.nodes.length + 1;
    logicFlow.render(initialGraphData);
    logicFlow.fitView(40, 40);
    syncGraphSnapshot();
    message.success('已恢复默认 Demo');
  }

  function clearDemoGraph() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    logicFlow.clearData();
    syncGraphSnapshot();
    message.success('画布已清空');
  }

  return (
    <PageContainer
      description="流程定义页当前接入了 LogicFlow Demo，可直接拖拽节点、手动画线，并在右侧查看当前图数据。"
      title="流程定义"
    >
      <Row gutter={[16, 16]}>
        <Col lg={6} span={24}>
          <Card title="快捷操作">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button block onClick={addRectNode} type="primary">
                新增审批节点
              </Button>
              <Button block onClick={addDiamondNode}>
                新增条件节点
              </Button>
              <Button block onClick={resetDemoGraph}>
                恢复默认 Demo
              </Button>
              <Button block danger onClick={clearDemoGraph}>
                清空画布
              </Button>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                当前先用最小交互验证流程编辑体验。后续如要接真实保存接口、属性面板、自定义节点和发布动作，都建议从本页继续扩展。
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>

        <Col lg={12} span={24}>
          <Card title="流程设计画布">
            <div
              ref={canvasRef}
              style={{
                background:
                  'linear-gradient(180deg, rgba(22,104,220,0.04) 0%, rgba(22,104,220,0.01) 100%)',
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                minHeight: 560,
                overflow: 'hidden',
                width: '100%',
              }}
            />
          </Card>
        </Col>

        <Col lg={6} span={24}>
          <Card title="当前图数据">
            <div
              style={{
                background: '#0f172a',
                borderRadius: 12,
                color: '#e2e8f0',
                fontFamily:
                  'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
                fontSize: 12,
                lineHeight: 1.6,
                maxHeight: 560,
                minHeight: 560,
                overflow: 'auto',
                padding: 16,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {graphSnapshot}
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}

export default ProcessDefinitionPage;
