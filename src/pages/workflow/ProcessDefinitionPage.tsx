import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/dist/index.css';
import PageContainer from '@/components/PageContainer';

const nodeRoleOptions = [
  { label: '开始/结束', value: 'START_END' },
  { label: '审批节点', value: 'APPROVAL' },
  { label: '抄送节点', value: 'COPY' },
  { label: '条件节点', value: 'CONDITION' },
  { label: '并行拆分', value: 'PARALLEL_SPLIT' },
  { label: '并行聚合', value: 'PARALLEL_JOIN' },
] as const;

const approverTypeOptions = [
  { label: '指定用户', value: 'USER' },
  { label: '指定角色', value: 'ROLE' },
  { label: '部门负责人', value: 'DEPT_LEADER' },
  { label: '发起人自选', value: 'INITIATOR_SELECT' },
] as const;

const approveModeOptions = [
  { label: '或签', value: 'OR_SIGN' },
  { label: '会签', value: 'COUNTERSIGN' },
  { label: '顺序签', value: 'SEQUENTIAL_SIGN' },
] as const;

const timeoutStrategyOptions = [
  { label: '仅提醒，不自动处理', value: 'REMIND_ONLY' },
  { label: '自动通过', value: 'AUTO_PASS' },
  { label: '自动驳回', value: 'AUTO_REJECT' },
  { label: '转交管理员处理', value: 'TRANSFER_ADMIN' },
] as const;

const conditionTypeOptions = [
  { label: '始终通过', value: 'ALWAYS' },
  { label: '表达式条件', value: 'EXPRESSION' },
] as const;

// 初始流程图直接放一个“条件判断 + 并行审批”的示例，方便同时演示节点属性和连线条件。
// 后续接真实流程定义接口时，可以继续沿用当前 properties 结构，不需要推翻整套交互。
const initialGraphData = {
  nodes: [
    {
      id: 'start-node',
      properties: {
        nodeRole: 'START_END',
      },
      text: '开始',
      type: 'circle',
      x: 120,
      y: 220,
    },
    {
      id: 'condition-node',
      properties: {
        nodeRole: 'CONDITION',
        remindAfterMinutes: 10,
        timeoutAfterMinutes: 60,
        timeoutStrategy: 'REMIND_ONLY',
      },
      text: '金额判断',
      type: 'diamond',
      x: 300,
      y: 220,
    },
    {
      id: 'parallel-split-node',
      properties: {
        nodeRole: 'PARALLEL_SPLIT',
      },
      text: '并行拆分',
      type: 'diamond',
      x: 480,
      y: 220,
    },
    {
      id: 'approve-finance-node',
      properties: {
        approveMode: 'COUNTERSIGN',
        approverIds: ['finance_manager'],
        approverType: 'ROLE',
        nodeRole: 'APPROVAL',
        remindAfterMinutes: 30,
        timeoutAfterMinutes: 240,
        timeoutStrategy: 'REMIND_ONLY',
      },
      text: '财务审批',
      type: 'rect',
      x: 720,
      y: 140,
    },
    {
      id: 'approve-hr-node',
      properties: {
        approveMode: 'OR_SIGN',
        approverIds: ['hr_manager'],
        approverType: 'ROLE',
        nodeRole: 'APPROVAL',
        remindAfterMinutes: 15,
        timeoutAfterMinutes: 120,
        timeoutStrategy: 'AUTO_PASS',
      },
      text: '人事审批',
      type: 'rect',
      x: 720,
      y: 300,
    },
    {
      id: 'parallel-join-node',
      properties: {
        nodeRole: 'PARALLEL_JOIN',
      },
      text: '并行聚合',
      type: 'diamond',
      x: 940,
      y: 220,
    },
    {
      id: 'end-node',
      properties: {
        nodeRole: 'START_END',
      },
      text: '结束',
      type: 'circle',
      x: 1160,
      y: 220,
    },
  ],
  edges: [
    {
      id: 'edge-start-condition',
      properties: {
        conditionType: 'ALWAYS',
        expression: '',
        isDefault: false,
        priority: 1,
      },
      sourceNodeId: 'start-node',
      targetNodeId: 'condition-node',
      text: '提交申请',
      type: 'polyline',
    },
    {
      id: 'edge-condition-split',
      properties: {
        conditionType: 'EXPRESSION',
        expression: 'amount >= 5000',
        isDefault: false,
        priority: 10,
      },
      sourceNodeId: 'condition-node',
      targetNodeId: 'parallel-split-node',
      text: '进入审批',
      type: 'polyline',
    },
    {
      id: 'edge-condition-end',
      properties: {
        conditionType: 'EXPRESSION',
        expression: 'amount < 5000',
        isDefault: true,
        priority: 20,
      },
      // 条件节点默认右锚点是 x + 30，结束节点默认左锚点是 x - 50。
      // 这里显式固定锚点和折线坐标，避免 LogicFlow 自动推导时把“无需审批”分支画歪。
      // 这条“无需审批”分支故意从上方绕行，避免与主审批链路挤在同一水平线上难以查看。
      // 后续如果改成真实流程数据，可以继续由后端返回 pointsList 或在前端按布局规则动态生成。
      pointsList: [
        { x: 330, y: 220 },
        { x: 330, y: 80 },
        { x: 1110, y: 80 },
        { x: 1110, y: 220 },
      ],
      sourceNodeId: 'condition-node',
      sourceAnchorId: 'condition-node_1',
      targetNodeId: 'end-node',
      targetAnchorId: 'end-node_3',
      text: '无需审批',
      type: 'polyline',
    },
    {
      id: 'edge-split-finance',
      properties: {
        conditionType: 'EXPRESSION',
        expression: 'department === "FINANCE" || amount >= 10000',
        isDefault: false,
        priority: 30,
      },
      sourceNodeId: 'parallel-split-node',
      targetNodeId: 'approve-finance-node',
      text: '财务线',
      type: 'polyline',
    },
    {
      id: 'edge-split-hr',
      properties: {
        conditionType: 'EXPRESSION',
        expression: 'department !== "FINANCE"',
        isDefault: true,
        priority: 40,
      },
      sourceNodeId: 'parallel-split-node',
      targetNodeId: 'approve-hr-node',
      text: '人事线',
      type: 'polyline',
    },
    {
      id: 'edge-finance-join',
      properties: {
        conditionType: 'ALWAYS',
        expression: '',
        isDefault: false,
        priority: 50,
      },
      sourceNodeId: 'approve-finance-node',
      targetNodeId: 'parallel-join-node',
      text: '审批通过',
      type: 'polyline',
    },
    {
      id: 'edge-hr-join',
      properties: {
        conditionType: 'ALWAYS',
        expression: '',
        isDefault: false,
        priority: 60,
      },
      sourceNodeId: 'approve-hr-node',
      targetNodeId: 'parallel-join-node',
      text: '审批通过',
      type: 'polyline',
    },
    {
      id: 'edge-join-end',
      properties: {
        conditionType: 'ALWAYS',
        expression: '',
        isDefault: false,
        priority: 70,
      },
      sourceNodeId: 'parallel-join-node',
      targetNodeId: 'end-node',
      text: '流程结束',
      type: 'polyline',
    },
  ],
};

// 物料区先覆盖审批流里最常见的一组节点。
// 新拖入的节点会带上基础 nodeRole，右侧属性面板再继续补充审核人、审核方式等配置。
const draggableNodeMaterials = [
  {
    description: '用于普通审批处理',
    label: '审批节点',
    nodeRole: 'APPROVAL',
    text: '审批节点',
    type: 'rect',
  },
  {
    description: '用于流程开始或结束',
    label: '开始节点',
    nodeRole: 'START_END',
    text: '开始',
    type: 'circle',
  },
  {
    description: '用于条件分支判断',
    label: '条件节点',
    nodeRole: 'CONDITION',
    text: '条件节点',
    type: 'diamond',
  },
  {
    description: '用于开启并行审批分支',
    label: '并行拆分',
    nodeRole: 'PARALLEL_SPLIT',
    text: '并行拆分',
    type: 'diamond',
  },
  {
    description: '用于等待并行分支汇聚',
    label: '并行聚合',
    nodeRole: 'PARALLEL_JOIN',
    text: '并行聚合',
    type: 'diamond',
  },
] as const;

interface ContextMenuState {
  elementId: string;
  elementType: 'edge' | 'node';
  x: number;
  y: number;
}

const CONTEXT_MENU_WIDTH = 150;
const CONTEXT_MENU_HEIGHT = 52;

interface SelectedElementState {
  id: string;
  type: 'edge' | 'node';
}

interface NodeFormValues {
  approveMode?: string;
  approverIds?: string;
  approverType?: string;
  nodeName: string;
  nodeRole?: string;
  remindAfterMinutes?: number;
  timeoutAfterMinutes?: number;
  timeoutStrategy?: string;
}

interface EdgeFormValues {
  conditionExpression?: string;
  conditionType?: string;
  edgeName: string;
  isDefault?: boolean;
  priority?: number;
}

interface HistoryActionState {
  canRedo: boolean;
  canUndo: boolean;
}

function getTextValue(text: unknown) {
  if (typeof text === 'string') {
    return text;
  }

  if (text && typeof text === 'object' && 'value' in text) {
    return String((text as { value?: unknown }).value ?? '');
  }

  return '';
}

function normalizeApproverIds(input?: string) {
  return input
    ?.split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function stringifyApproverIds(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function ProcessDefinitionPage() {
  const { message } = AntdApp.useApp();
  const [nodeForm] = Form.useForm<NodeFormValues>();
  const [edgeForm] = Form.useForm<EdgeFormValues>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const logicFlowRef = useRef<LogicFlow | null>(null);
  const nodeSequenceRef = useRef(initialGraphData.nodes.length + 1);
  const [graphDataCollapsed, setGraphDataCollapsed] = useState(true);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [historyActionState, setHistoryActionState] = useState<HistoryActionState>({
    canRedo: false,
    canUndo: false,
  });
  const [selectedElement, setSelectedElement] = useState<SelectedElementState | null>(null);
  const [graphSnapshot, setGraphSnapshot] = useState(
    JSON.stringify(initialGraphData, null, 2),
  );

  const sidePanelVisible = Boolean(selectedElement) || !graphDataCollapsed;
  const selectedNodeRole = Form.useWatch('nodeRole', nodeForm);
  const isApprovalNodeSelected = selectedElement?.type === 'node' && selectedNodeRole === 'APPROVAL';
  const supportsTimingConfig = selectedElement?.type === 'node' && selectedNodeRole !== 'START_END';

  function syncGraphSnapshot() {
    const currentGraphData = logicFlowRef.current?.getGraphData();

    setGraphSnapshot(JSON.stringify(currentGraphData ?? initialGraphData, null, 2));
  }

  function syncHistoryActionState() {
    const logicFlow = logicFlowRef.current;

    setHistoryActionState({
      canRedo: Boolean(logicFlow?.history.redoAble()),
      canUndo: Boolean(logicFlow?.history.undoAble()),
    });
  }

  function syncSelectedElementPanel() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow || !selectedElement) {
      return;
    }

    if (selectedElement.type === 'node') {
      const nodeData = logicFlow.getNodeDataById(selectedElement.id);

      if (!nodeData) {
        setSelectedElement(null);
        return;
      }

      nodeForm.setFieldsValue({
        approveMode:
          typeof nodeData.properties?.approveMode === 'string'
            ? nodeData.properties.approveMode
            : undefined,
        approverIds: stringifyApproverIds(nodeData.properties?.approverIds),
        approverType:
          typeof nodeData.properties?.approverType === 'string'
            ? nodeData.properties.approverType
            : undefined,
        nodeName: getTextValue(nodeData.text),
        nodeRole:
          typeof nodeData.properties?.nodeRole === 'string'
            ? nodeData.properties.nodeRole
            : undefined,
        remindAfterMinutes:
          typeof nodeData.properties?.remindAfterMinutes === 'number'
            ? nodeData.properties.remindAfterMinutes
            : undefined,
        timeoutAfterMinutes:
          typeof nodeData.properties?.timeoutAfterMinutes === 'number'
            ? nodeData.properties.timeoutAfterMinutes
            : undefined,
        timeoutStrategy:
          typeof nodeData.properties?.timeoutStrategy === 'string'
            ? nodeData.properties.timeoutStrategy
            : undefined,
      });
      return;
    }

    const edgeData = logicFlow.getEdgeDataById(selectedElement.id);

    if (!edgeData) {
      setSelectedElement(null);
      return;
    }

    edgeForm.setFieldsValue({
      conditionExpression:
        typeof edgeData.properties?.expression === 'string'
          ? edgeData.properties.expression
          : undefined,
      conditionType:
        typeof edgeData.properties?.conditionType === 'string'
          ? edgeData.properties.conditionType
          : 'ALWAYS',
      edgeName: getTextValue(edgeData.text),
      isDefault: Boolean(edgeData.properties?.isDefault),
      priority:
        typeof edgeData.properties?.priority === 'number'
          ? edgeData.properties.priority
          : undefined,
    });
  }

  function getContextMenuPosition(event: MouseEvent) {
    const containerRect = canvasRef.current?.getBoundingClientRect();

    if (!containerRect) {
      return {
        x: 0,
        y: 0,
      };
    }

    // 右键菜单改为基于浏览器实际鼠标坐标计算，再映射回画布容器内部坐标。
    // 这样可以避开 LogicFlow 画布缩放、平移后 overlay 坐标与视觉位置不一致的问题。
    // 后续如果菜单项变多，只需要调整宽高常量即可继续复用这套约束逻辑。
    const rawX = event.clientX - containerRect.left;
    const rawY = event.clientY - containerRect.top;
    const x = Math.min(Math.max(rawX, 8), Math.max(containerRect.width - CONTEXT_MENU_WIDTH - 8, 8));
    const y = Math.min(Math.max(rawY, 8), Math.max(containerRect.height - CONTEXT_MENU_HEIGHT - 8, 8));

    return { x, y };
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
    syncHistoryActionState();

    // 画布变更、连线、删除后都统一刷新右侧 JSON，确保设计结果对用户可见。
    logicFlow.on('history:change', () => {
      syncGraphSnapshot();
      syncHistoryActionState();
      syncSelectedElementPanel();
    });
    logicFlow.on('graph:rendered', () => {
      syncGraphSnapshot();
      syncHistoryActionState();
    });
    logicFlow.on('node:click', ({ data }) => {
      setSelectedElement({
        id: data.id,
        type: 'node',
      });
      setContextMenuState(null);
    });
    logicFlow.on('edge:click', ({ data }) => {
      setSelectedElement({
        id: data.id,
        type: 'edge',
      });
      setContextMenuState(null);
    });
    // 节点和连线右键都收口到一套上下文菜单状态，便于后续继续扩展“复制、重命名、属性”动作。
    logicFlow.on('node:contextmenu', ({ data, e }) => {
      e.preventDefault();
      const menuPosition = getContextMenuPosition(e);
      setSelectedElement({
        id: data.id,
        type: 'node',
      });
      setContextMenuState({
        elementId: data.id,
        elementType: 'node',
        x: menuPosition.x,
        y: menuPosition.y,
      });
    });
    logicFlow.on('edge:contextmenu', ({ data, e }) => {
      e.preventDefault();
      const menuPosition = getContextMenuPosition(e);
      setSelectedElement({
        id: data.id,
        type: 'edge',
      });
      setContextMenuState({
        elementId: data.id,
        elementType: 'edge',
        x: menuPosition.x,
        y: menuPosition.y,
      });
    });
    logicFlow.on('blank:click', () => {
      setContextMenuState(null);
      setSelectedElement(null);
    });
    logicFlow.on('blank:contextmenu', ({ e }) => {
      e.preventDefault();
      setContextMenuState(null);
      setSelectedElement(null);
    });

    return () => {
      logicFlow.destroy();
      logicFlowRef.current = null;
    };
  }, []);

  useEffect(() => {
    // 右键菜单只在点击菜单外部时关闭，避免点击“删除”按钮时被全局 click 监听提前打断。
    // 后续如果要继续往菜单里加“复制、重命名、查看属性”等动作，也可以继续复用这一层外部点击判断。
    function closeContextMenu(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Node && contextMenuRef.current?.contains(target)) {
        return;
      }

      setContextMenuState(null);
    }

    window.addEventListener('mousedown', closeContextMenu);

    return () => {
      window.removeEventListener('mousedown', closeContextMenu);
    };
  }, []);

  useEffect(() => {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow || !canvasRef.current) {
      return;
    }

    // 右侧属性面板或 JSON 面板显示状态变化后，画布实际宽度会变化。
    // 这里统一触发 resize，保证 LogicFlow 始终基于最新容器尺寸重算布局。
    const resizeTimer = window.setTimeout(() => {
      if (!canvasRef.current) {
        return;
      }

      logicFlow.resize(canvasRef.current.clientWidth, 560);
      logicFlow.fitView(40, 40);
    }, 0);

    return () => {
      window.clearTimeout(resizeTimer);
    };
  }, [graphDataCollapsed, sidePanelVisible]);

  useEffect(() => {
    if (!selectedElement) {
      nodeForm.resetFields();
      edgeForm.resetFields();
      return;
    }

    syncSelectedElementPanel();
  }, [edgeForm, nodeForm, selectedElement]);

  function resetDemoGraph() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    nodeSequenceRef.current = initialGraphData.nodes.length + 1;
    logicFlow.render(initialGraphData);
    setSelectedElement(null);
    setContextMenuState(null);
    syncGraphSnapshot();
    syncHistoryActionState();
    logicFlow.fitView(40, 40);
    message.success('已恢复默认 Demo');
  }

  function clearDemoGraph() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    logicFlow.clearData();
    setSelectedElement(null);
    setContextMenuState(null);
    syncGraphSnapshot();
    syncHistoryActionState();
    message.success('画布已清空');
  }

  function startDragNodeMaterial(
    event: ReactMouseEvent<HTMLButtonElement>,
    material: (typeof draggableNodeMaterials)[number],
  ) {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    // 物料拖拽直接使用 LogicFlow 内置 dnd，
    // 这样落点坐标、拖拽预览和画布内节点创建都由引擎统一处理。
    event.preventDefault();
    logicFlow.dnd.startDrag({
      properties: {
        approveMode: material.nodeRole === 'APPROVAL' ? 'OR_SIGN' : undefined,
        approverIds: material.nodeRole === 'APPROVAL' ? [] : undefined,
        approverType: material.nodeRole === 'APPROVAL' ? 'USER' : undefined,
        nodeRole: material.nodeRole,
        remindAfterMinutes: material.nodeRole === 'APPROVAL' ? 30 : undefined,
        timeoutAfterMinutes: material.nodeRole === 'APPROVAL' ? 120 : undefined,
        timeoutStrategy: material.nodeRole === 'APPROVAL' ? 'REMIND_ONLY' : undefined,
      },
      text: material.text,
      type: material.type,
      x: 0,
      y: 0,
    });
  }

  function deleteContextMenuTarget() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow || !contextMenuState) {
      return;
    }

    // 删除前先把目标缓存下来，避免状态更新后闭包读取到空值。
    // 这样即使后续 delete 过程中触发了 history:change，也不会影响当前删除动作的提示和清理逻辑。
    const { elementId, elementType } = contextMenuState;

    logicFlow.deleteElement(elementId);
    setContextMenuState(null);
    setSelectedElement((currentSelection) => (currentSelection?.id === elementId ? null : currentSelection));
    syncGraphSnapshot();
    message.success(elementType === 'node' ? '节点已删除' : '连线已删除');
  }

  function undoCanvasChange() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow?.history.undoAble()) {
      return;
    }

    // 撤销和恢复都交给 LogicFlow 的历史栈处理，避免前端自己维护画布快照导致状态分叉。
    // 后续如果接保存草稿或多人协同，可以继续在这里追加埋点或二次确认逻辑。
    logicFlow.undo();
    syncGraphSnapshot();
    syncHistoryActionState();
  }

  function redoCanvasChange() {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow?.history.redoAble()) {
      return;
    }

    logicFlow.redo();
    syncGraphSnapshot();
    syncHistoryActionState();
  }

  function handleNodeFormChange(_: unknown, allValues: NodeFormValues) {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow || selectedElement?.type !== 'node') {
      return;
    }

    logicFlow.updateText(selectedElement.id, allValues.nodeName || '未命名节点');
    logicFlow.setProperties(selectedElement.id, {
      approveMode: allValues.approveMode,
      approverIds: normalizeApproverIds(allValues.approverIds),
      approverType: allValues.approverType,
      nodeRole: allValues.nodeRole,
      remindAfterMinutes: allValues.remindAfterMinutes,
      timeoutAfterMinutes: allValues.timeoutAfterMinutes,
      timeoutStrategy: allValues.timeoutStrategy,
    });
    syncGraphSnapshot();
  }

  function handleEdgeFormChange(_: unknown, allValues: EdgeFormValues) {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow || selectedElement?.type !== 'edge') {
      return;
    }

    logicFlow.updateText(selectedElement.id, allValues.edgeName || '');
    logicFlow.setProperties(selectedElement.id, {
      conditionType: allValues.conditionType,
      expression: allValues.conditionExpression,
      isDefault: Boolean(allValues.isDefault),
      priority: allValues.priority,
    });
    syncGraphSnapshot();
  }

  const nodeRoleTag = useMemo(
    () =>
      nodeRoleOptions.find((option) => option.value === selectedNodeRole)?.label ?? selectedNodeRole,
    [selectedNodeRole],
  );

  return (
    <PageContainer
      description="流程定义页当前接入了 LogicFlow Demo，支持拖拽节点、右键删除、节点属性配置和连线条件配置。"
      title="流程定义"
    >
      <Row gutter={[16, 16]}>
        <Col lg={4} span={24}>
          <Card title="快捷操作">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button block disabled={!historyActionState.canUndo} onClick={undoCanvasChange}>
                撤销操作
              </Button>
              <Button block disabled={!historyActionState.canRedo} onClick={redoCanvasChange}>
                恢复操作
              </Button>
              <Button block onClick={resetDemoGraph}>
                恢复默认 Demo
              </Button>
              <Button block danger onClick={clearDemoGraph}>
                清空画布
              </Button>
            </Space>
          </Card>

          <Card style={{ marginTop: 16 }} title="节点物料">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {draggableNodeMaterials.map((material) => (
                <button
                  key={material.label}
                  onMouseDown={(event) => startDragNodeMaterial(event, material)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #dbeafe',
                    borderRadius: 12,
                    color: '#1e293b',
                    cursor: 'grab',
                    padding: '12px 14px',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  type="button"
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{material.label}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    {material.description}
                  </div>
                </button>
              ))}
            </Space>
          </Card>
        </Col>

        <Col lg={sidePanelVisible ? 14 : 20} span={24}>
          <Card
            extra={
              <Button
                onClick={() => setGraphDataCollapsed((currentState) => !currentState)}
                type="link"
              >
                {graphDataCollapsed ? '展开图数据' : '折叠图数据'}
              </Button>
            }
            title="流程设计画布"
          >
            <div
              ref={canvasRef}
              style={{
                background:
                  'linear-gradient(180deg, rgba(22,104,220,0.04) 0%, rgba(22,104,220,0.01) 100%)',
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                minHeight: 560,
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
              }}
            >
              {contextMenuState && (
                <div
                  ref={contextMenuRef}
                  onClick={(event) => event.stopPropagation()}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.25)',
                    borderRadius: 12,
                    boxShadow: '0 12px 24px rgba(15,23,42,0.18)',
                    left: contextMenuState.x,
                    minWidth: 120,
                    padding: 6,
                    position: 'absolute',
                    top: contextMenuState.y,
                    zIndex: 20,
                  }}
                >
                  <button
                    onClick={deleteContextMenuTarget}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    style={{
                      background: 'transparent',
                      border: 0,
                      borderRadius: 8,
                      color: '#f8fafc',
                      cursor: 'pointer',
                      display: 'block',
                      padding: '8px 10px',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    type="button"
                  >
                    删除{contextMenuState.elementType === 'node' ? '节点' : '连线'}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {sidePanelVisible && (
          <Col lg={6} span={24}>
            {selectedElement?.type === 'node' && (
              <Card title="节点属性">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="processing">节点</Tag>
                    {nodeRoleTag && <Tag>{nodeRoleTag}</Tag>}
                  </Space>
                  <Form<NodeFormValues>
                    form={nodeForm}
                    layout="vertical"
                    onValuesChange={handleNodeFormChange}
                  >
                    <Form.Item label="节点名称" name="nodeName">
                      <Input placeholder="请输入节点名称" />
                    </Form.Item>
                    <Form.Item label="节点类型" name="nodeRole">
                      <Select options={nodeRoleOptions.map((option) => ({ label: option.label, value: option.value }))} />
                    </Form.Item>
                    {isApprovalNodeSelected && (
                      <>
                        <Divider style={{ margin: '8px 0' }}>审批设置</Divider>
                        <Form.Item label="审核人类型" name="approverType">
                          <Select
                            options={approverTypeOptions.map((option) => ({
                              label: option.label,
                              value: option.value,
                            }))}
                            placeholder="请选择审核人类型"
                          />
                        </Form.Item>
                        <Form.Item
                          extra="多个审核人可用英文逗号、中文逗号或换行分隔。"
                          label="审核人"
                          name="approverIds"
                        >
                          <Input.TextArea
                            placeholder="例如：zhangsan, lisi"
                            rows={3}
                          />
                        </Form.Item>
                        <Form.Item label="审核方式" name="approveMode">
                          <Select
                            options={approveModeOptions.map((option) => ({
                              label: option.label,
                              value: option.value,
                            }))}
                            placeholder="请选择审核方式"
                          />
                        </Form.Item>
                      </>
                    )}
                    {supportsTimingConfig && (
                      <>
                        <Divider style={{ margin: '8px 0' }}>时限设置</Divider>
                        <Form.Item
                          extra="单位为分钟，达到时限后按下方超时策略处理。"
                          label="超时时限"
                          name="timeoutAfterMinutes"
                        >
                          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label="超时处理策略" name="timeoutStrategy">
                          <Select
                            options={timeoutStrategyOptions.map((option) => ({
                              label: option.label,
                              value: option.value,
                            }))}
                            placeholder="请选择超时处理策略"
                          />
                        </Form.Item>
                        <Form.Item
                          extra="到达提醒时限后可用于后续接消息通知、站内信或催办逻辑。"
                          label="提醒时限"
                          name="remindAfterMinutes"
                        >
                          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </>
                    )}
                  </Form>
                </Space>
              </Card>
            )}

            {selectedElement?.type === 'edge' && (
              <Card title="连线属性">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Tag color="purple">连线</Tag>
                  <Form<EdgeFormValues>
                    form={edgeForm}
                    layout="vertical"
                    onValuesChange={handleEdgeFormChange}
                  >
                    <Form.Item label="连线名称" name="edgeName">
                      <Input placeholder="请输入连线名称" />
                    </Form.Item>
                    <Form.Item label="条件类型" name="conditionType">
                      <Select
                        options={conditionTypeOptions.map((option) => ({
                          label: option.label,
                          value: option.value,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item label="条件表达式" name="conditionExpression">
                      <Input.TextArea
                        placeholder="例如：amount > 10000 && applicantLevel === 'M2'"
                        rows={4}
                      />
                    </Form.Item>
                    <Form.Item label="优先级" name="priority">
                      <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="默认分支" name="isDefault" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Form>
                </Space>
              </Card>
            )}

            {!graphDataCollapsed && (
              <Card style={{ marginTop: 16 }} title="当前图数据">
                <div
                  style={{
                    background: '#0f172a',
                    borderRadius: 12,
                    color: '#e2e8f0',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    maxHeight: selectedElement ? 260 : 560,
                    minHeight: selectedElement ? 260 : 560,
                    overflow: 'auto',
                    padding: 16,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {graphSnapshot}
                </div>
              </Card>
            )}
          </Col>
        )}
      </Row>
    </PageContainer>
  );
}

export default ProcessDefinitionPage;
