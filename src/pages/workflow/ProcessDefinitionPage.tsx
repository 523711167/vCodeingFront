import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  App as AntdApp,
  Alert,
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
  Tag,
  TreeSelect,
} from 'antd';
import LogicFlow from '@logicflow/core';
import '@logicflow/core/dist/index.css';
import { useSearchParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import { showErrorMessageOnce } from '@/services/error-message';
import { fetchDeptTree, type DeptTreeRecord } from '@/services/dept.service';
import { fetchRoleList, type RoleRecord } from '@/services/role.service';
import { fetchUserPage, type UserRecord } from '@/services/user.service';
import {
  createWorkflowDefinition,
  fetchWorkflowDefinitionDetail,
  updateWorkflowDefinition,
  type WorkflowDefinitionRecord,
  type WorkflowNodeRecord,
} from '@/services/workflow.service';

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
  { label: '指定组织', value: 'DEPT' },
  { label: '发起人主组织主管', value: 'INITIATOR_DEPT_LEADER' },
] as const;

const approveModeOptions = [
  { label: '或签', value: 'OR_SIGN' },
  { label: '会签', value: 'COUNTERSIGN' },
  { label: '顺序签', value: 'SEQUENTIAL_SIGN' },
] as const;

const timeoutStrategyOptions = [
  { label: '自动通过', value: 'AUTO_APPROVE' },
  { label: '自动拒绝', value: 'AUTO_REJECT' },
  { label: '仅提醒', value: 'NOTIFY_ONLY' },
] as const;

const conditionTypeOptions = [
  { label: '始终通过', value: 'ALWAYS' },
  { label: '表达式条件', value: 'EXPRESSION' },
] as const;

// 新建流程默认从空白画布开始，避免演示数据污染真实流程设计。
// 后续如果要接“模板新建”，建议单独走模板加载入口，而不是再把示例图塞回默认态。
const initialWorkflowCanvasData = {
  edges: [],
  nodes: [],
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
  approverIds?: string | string[];
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
  priority?: number;
}

interface HistoryActionState {
  canRedo: boolean;
  canUndo: boolean;
}

interface DeptTreeSelectOption {
  title: string;
  value: string;
  disabled?: boolean;
  children?: DeptTreeSelectOption[];
}

interface DefinitionFormValues {
  code: string;
  description?: string;
  name: string;
}

interface WorkflowCanvasNode {
  id: string;
  type: string;
  text?: string;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
}

interface WorkflowCanvasEdge {
  id?: string;
  sourceNodeId: string;
  targetNodeId: string;
  text?: string;
  type?: string;
  properties?: Record<string, unknown>;
  pointsList?: Array<{ x: number; y: number }>;
}

interface WorkflowCanvasData {
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
}

type WorkflowNodeRoleValue =
  | 'APPROVAL'
  | 'CONDITION'
  | 'COPY'
  | 'PARALLEL_JOIN'
  | 'PARALLEL_SPLIT'
  | 'START_END';

const backendNodeTypeToCanvasConfig = {
  APPROVAL: { nodeRole: 'APPROVAL', type: 'rect' },
  CONDITION: { nodeRole: 'CONDITION', type: 'diamond' },
  END: { nodeRole: 'START_END', type: 'circle' },
  PARALLEL_JOIN: { nodeRole: 'PARALLEL_JOIN', type: 'diamond' },
  PARALLEL_SPLIT: { nodeRole: 'PARALLEL_SPLIT', type: 'diamond' },
  START: { nodeRole: 'START_END', type: 'circle' },
} as const;

function hoursToMinutes(value?: number) {
  if (typeof value !== 'number' || value <= 0) {
    return undefined;
  }

  return value * 60;
}

function toCanvasApproveMode(value?: string) {
  switch (value) {
    case 'AND':
      return 'COUNTERSIGN';
    case 'SEQUENTIAL':
      return 'SEQUENTIAL_SIGN';
    case 'OR':
      return 'OR_SIGN';
    default:
      return undefined;
  }
}

function toCanvasTimeoutStrategy(value?: string) {
  switch (value) {
    case 'AUTO_APPROVE':
      return 'AUTO_APPROVE';
    case 'AUTO_REJECT':
      return 'AUTO_REJECT';
    case 'NOTIFY_ONLY':
      return 'NOTIFY_ONLY';
    default:
      return undefined;
  }
}

function toCanvasApproverType(value?: string) {
  switch (value) {
    case 'USER':
      return 'USER';
    case 'ROLE':
      return 'ROLE';
    case 'DEPT':
      return 'DEPT';
    case 'INITIATOR_DEPT_LEADER':
      return 'INITIATOR_DEPT_LEADER';
    default:
      return undefined;
  }
}

function isFormValidationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'errorFields' in (error as Record<string, unknown>),
  );
}

function isWorkflowCanvasData(value: unknown): value is WorkflowCanvasData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<WorkflowCanvasData>;
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

function parseNodeConfigJson(node: WorkflowNodeRecord) {
  if (typeof node.configJson !== 'string' || !node.configJson.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(node.configJson) as {
      originalNodeId?: unknown;
      originalNodeType?: unknown;
      uiProperties?: Record<string, unknown>;
    };

    return parsed;
  } catch {
    return undefined;
  }
}

function buildCanvasDataFromDefinition(detail: WorkflowDefinitionRecord): WorkflowCanvasData {
  // 新版后端直接把前端流程设计 JSON 原样保存到 workFlowJson。
  // 这里优先吃这份数据，可以最大程度保留节点 id、折线路径、右键编辑后的属性等画布细节。
  if (typeof detail.workFlowJson === 'string' && detail.workFlowJson.trim()) {
    try {
      const parsed = JSON.parse(detail.workFlowJson);

      if (isWorkflowCanvasData(parsed)) {
        return parsed;
      }
    } catch {
      // 回填时如果 workFlowJson 被旧数据污染，继续退回到 nodeList / transitionList 构图，
      // 这样历史流程至少还能打开，不会因为单条坏数据把整个页面卡死。
    }
  }

  const nodeIdMap = new Map<number, string>();
  const nodes = (detail.nodeList ?? []).map((node, index) => {
    const canvasNodeConfig = parseNodeConfigJson(node);
    const canvasConfig =
      backendNodeTypeToCanvasConfig[
        (node.nodeType as keyof typeof backendNodeTypeToCanvasConfig) ?? 'APPROVAL'
      ] ?? backendNodeTypeToCanvasConfig.APPROVAL;
    const nodeId =
      typeof canvasNodeConfig?.originalNodeId === 'string'
        ? canvasNodeConfig.originalNodeId
        : String(node.id || `NODE_${index + 1}`);

    if (typeof node.id === 'number') {
      nodeIdMap.set(node.id, nodeId);
    }

    return {
      id: nodeId,
      properties: {
        approverIds: Array.isArray(node.approverList)
          ? node.approverList.map((item) => item?.approverValue).filter(Boolean)
          : [],
        approverType: Array.isArray(node.approverList)
          ? toCanvasApproverType(node.approverList[0]?.approverType)
          : undefined,
        approveMode: toCanvasApproveMode(node.approveMode as string | undefined),
        ...(canvasNodeConfig?.uiProperties ?? {}),
        nodeRole: canvasConfig.nodeRole,
        remindAfterMinutes: hoursToMinutes(node.remindHours as number | undefined),
        timeoutAfterMinutes: hoursToMinutes(node.timeoutHours as number | undefined),
        timeoutStrategy: toCanvasTimeoutStrategy(node.timeoutAction as string | undefined),
      },
      text: typeof node.name === 'string' ? node.name : `节点${index + 1}`,
      type:
        typeof canvasNodeConfig?.originalNodeType === 'string'
          ? canvasNodeConfig.originalNodeType
          : canvasConfig.type,
      x: Number(node.positionX ?? 200 + index * 120),
      y: Number(node.positionY ?? 220),
    } satisfies WorkflowCanvasNode;
  });

  const edges = (detail.transitionList ?? []).map((transition, index) => {
    const conditionExpr =
      typeof transition.conditionExpr === 'string' ? transition.conditionExpr : '';
    const label = typeof transition.label === 'string' ? transition.label : '';
    const priority =
      typeof transition.priority === 'number' ? transition.priority : undefined;

    return {
      id: String(transition.id || `EDGE_${index + 1}`),
      properties: {
        conditionType: conditionExpr ? 'EXPRESSION' : 'ALWAYS',
        expression: conditionExpr,
        priority,
      },
      sourceNodeId:
        typeof transition.fromNodeId === 'number'
          ? (nodeIdMap.get(transition.fromNodeId) ?? String(transition.fromNodeId))
          : '',
      targetNodeId:
        typeof transition.toNodeId === 'number'
          ? (nodeIdMap.get(transition.toNodeId) ?? String(transition.toNodeId))
          : '',
      text: label,
      type: 'polyline',
    } satisfies WorkflowCanvasEdge;
  }).filter((edge) => edge.sourceNodeId && edge.targetNodeId);

  return {
    edges,
    nodes,
  };
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

function normalizeApproverIds(input?: string | string[]) {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return input
    ?.split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function stringifyApproverIds(value: unknown, approverType?: string) {
  if (Array.isArray(value)) {
    return approverType === 'ROLE' || approverType === 'USER' || approverType === 'DEPT'
      ? value
      : value.join(', ');
  }

  return approverType === 'ROLE' || approverType === 'USER' || approverType === 'DEPT'
    ? []
    : '';
}

function buildDeptTreeSelectData(
  nodes: DeptTreeRecord[],
  disabledDeptIds: Set<string>,
): DeptTreeSelectOption[] {
  return nodes.map((node) => ({
    disabled: disabledDeptIds.has(String(node.id)),
    title: node.name,
    value: String(node.id),
    children: node.children ? buildDeptTreeSelectData(node.children, disabledDeptIds) : undefined,
  }));
}

function flattenDeptTree(nodes: DeptTreeRecord[]): DeptTreeRecord[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenDeptTree(node.children ?? []),
  ]);
}

function buildDeptParentIdMap(
  nodes: DeptTreeRecord[],
  parentIdMap = new Map<string, string>(),
) {
  nodes.forEach((node) => {
    parentIdMap.set(String(node.id), String(node.parentId));

    if (node.children?.length) {
      buildDeptParentIdMap(node.children, parentIdMap);
    }
  });

  return parentIdMap;
}

function buildDeptDescendantIdsMap(
  nodes: DeptTreeRecord[],
  descendantIdsMap = new Map<string, string[]>(),
) {
  nodes.forEach((node) => {
    const descendantIds = flattenDeptTree(node.children ?? []).map((child) => String(child.id));

    descendantIdsMap.set(String(node.id), descendantIds);

    if (node.children?.length) {
      buildDeptDescendantIdsMap(node.children, descendantIdsMap);
    }
  });

  return descendantIdsMap;
}

function collectAncestorDeptIds(
  deptId: string,
  parentIdMap: Map<string, string>,
) {
  const ancestorIds: string[] = [];
  let currentParentId = parentIdMap.get(deptId);

  while (currentParentId && currentParentId !== '0') {
    ancestorIds.push(currentParentId);
    currentParentId = parentIdMap.get(currentParentId);
  }

  return ancestorIds;
}

function hasSelectedAncestorDept(
  deptId: string,
  selectedDeptIds: string[],
  parentIdMap: Map<string, string>,
) {
  return collectAncestorDeptIds(deptId, parentIdMap).some((ancestorId) =>
    selectedDeptIds.includes(ancestorId),
  );
}

function normalizeSelectedDeptIds(
  nextDeptIds: string[],
  previousDeptIds: string[],
  parentIdMap: Map<string, string>,
  descendantIdsMap: Map<string, string[]>,
) {
  let normalizedDeptIds = previousDeptIds.filter((deptId) => nextDeptIds.includes(deptId));
  const addedDeptIds = nextDeptIds.filter((deptId) => !previousDeptIds.includes(deptId));

  addedDeptIds.forEach((deptId) => {
    if (hasSelectedAncestorDept(deptId, normalizedDeptIds, parentIdMap)) {
      return;
    }

    const descendantDeptIds = descendantIdsMap.get(deptId) ?? [];

    normalizedDeptIds = normalizedDeptIds.filter(
      (selectedDeptId) => !descendantDeptIds.includes(selectedDeptId),
    );
    normalizedDeptIds.push(deptId);
  });

  return normalizedDeptIds;
}

function buildDisabledDeptIds(
  selectedDeptIds: string[],
  parentIdMap: Map<string, string>,
  descendantIdsMap: Map<string, string[]>,
) {
  const disabledDeptIds = new Set<string>();

  selectedDeptIds.forEach((deptId) => {
    collectAncestorDeptIds(deptId, parentIdMap).forEach((ancestorId) => {
      disabledDeptIds.add(ancestorId);
    });

    (descendantIdsMap.get(deptId) ?? []).forEach((descendantId) => {
      disabledDeptIds.add(descendantId);
    });
  });

  selectedDeptIds.forEach((deptId) => {
    disabledDeptIds.delete(deptId);
  });

  return disabledDeptIds;
}

function inferNodeRoleFromCanvasNode(nodeData: {
  properties?: Record<string, unknown>;
  text?: unknown;
  type?: string;
}): WorkflowNodeRoleValue | undefined {
  const explicitNodeRole =
    typeof nodeData.properties?.nodeRole === 'string'
      ? (nodeData.properties.nodeRole as WorkflowNodeRoleValue)
      : undefined;

  if (explicitNodeRole) {
    return explicitNodeRole;
  }

  const nodeText = getTextValue(nodeData.text);

  if (nodeData.type === 'circle') {
    return 'START_END';
  }

  if (nodeData.type === 'rect') {
    return 'APPROVAL';
  }

  if (nodeData.type === 'diamond') {
    if (nodeText.includes('并行拆分')) {
      return 'PARALLEL_SPLIT';
    }

    if (nodeText.includes('并行聚合')) {
      return 'PARALLEL_JOIN';
    }

    // 旧图数据里如果没有显式 nodeRole，菱形节点默认按条件节点处理，
    // 这样至少不会丢掉时限配置和条件节点属性面板。
    return 'CONDITION';
  }

  return undefined;
}

function ProcessDefinitionPage() {
  const { message } = AntdApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const readonlyMode = searchParams.get('readonly') === '1';
  const [definitionForm] = Form.useForm<DefinitionFormValues>();
  const [nodeForm] = Form.useForm<NodeFormValues>();
  const [edgeForm] = Form.useForm<EdgeFormValues>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const logicFlowRef = useRef<LogicFlow | null>(null);
  const [currentDefinitionId, setCurrentDefinitionId] = useState<number | null>(() => {
    const rawDefinitionId = Number(searchParams.get('id') ?? '');

    return Number.isFinite(rawDefinitionId) && rawDefinitionId > 0 ? rawDefinitionId : null;
  });
  const [definitionSaving, setDefinitionSaving] = useState(false);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [graphDataCollapsed, setGraphDataCollapsed] = useState(true);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [historyActionState, setHistoryActionState] = useState<HistoryActionState>({
    canRedo: false,
    canUndo: false,
  });
  const [deptTreeOptions, setDeptTreeOptions] = useState<DeptTreeRecord[]>([]);
  const [deptTreeOptionsLoading, setDeptTreeOptionsLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<RoleRecord[]>([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserRecord[]>([]);
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementState | null>(null);
  const [selectedNodeRoleState, setSelectedNodeRoleState] = useState<WorkflowNodeRoleValue | undefined>();
  const [selectedApproverTypeState, setSelectedApproverTypeState] = useState<string | undefined>();
  const [graphSnapshot, setGraphSnapshot] = useState(
    JSON.stringify(initialWorkflowCanvasData, null, 2),
  );

  const sidePanelVisible = Boolean(selectedElement) || !graphDataCollapsed;
  const selectedApproverIds = Form.useWatch('approverIds', nodeForm);
  const selectedNodeRole = selectedNodeRoleState;
  const isApprovalNodeSelected = selectedElement?.type === 'node' && selectedNodeRole === 'APPROVAL';
  const supportsTimingConfig = selectedElement?.type === 'node' && selectedNodeRole === 'APPROVAL';
  const selectedApproverDeptIds =
    selectedApproverTypeState === 'DEPT' && Array.isArray(selectedApproverIds)
      ? selectedApproverIds.map((item) => String(item))
      : [];
  const approverDeptParentIdMap = useMemo(
    () => buildDeptParentIdMap(deptTreeOptions),
    [deptTreeOptions],
  );
  const approverDeptDescendantIdsMap = useMemo(
    () => buildDeptDescendantIdsMap(deptTreeOptions),
    [deptTreeOptions],
  );
  const disabledApproverDeptIds = useMemo(
    () =>
      buildDisabledDeptIds(
        selectedApproverDeptIds,
        approverDeptParentIdMap,
        approverDeptDescendantIdsMap,
      ),
    [approverDeptDescendantIdsMap, approverDeptParentIdMap, selectedApproverDeptIds],
  );

  function syncGraphSnapshot() {
    const currentGraphData = logicFlowRef.current?.getGraphData();

    setGraphSnapshot(JSON.stringify(currentGraphData ?? initialWorkflowCanvasData, null, 2));
  }

  function renderWorkflowGraph(nextGraphData: WorkflowCanvasData) {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    logicFlow.render(nextGraphData);
    setSelectedElement(null);
    setSelectedNodeRoleState(undefined);
    setContextMenuState(null);
    syncGraphSnapshot();
    syncHistoryActionState();
    logicFlow.fitView(40, 40);
  }

  function syncHistoryActionState() {
    const logicFlow = logicFlowRef.current;

    if (readonlyMode) {
      setHistoryActionState({
        canRedo: false,
        canUndo: false,
      });
      return;
    }

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
        setSelectedNodeRoleState(undefined);
        return;
      }

      const inferredNodeRole = inferNodeRoleFromCanvasNode(nodeData);
      const approverType =
        typeof nodeData.properties?.approverType === 'string'
          ? nodeData.properties.approverType
          : undefined;
      setSelectedNodeRoleState(inferredNodeRole);
      setSelectedApproverTypeState(approverType);

      nodeForm.setFieldsValue({
        approveMode:
          typeof nodeData.properties?.approveMode === 'string'
            ? nodeData.properties.approveMode
            : undefined,
        approverIds: stringifyApproverIds(nodeData.properties?.approverIds, approverType),
        approverType,
        nodeName: getTextValue(nodeData.text),
        nodeRole: inferredNodeRole,
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
      setSelectedNodeRoleState(undefined);
      setSelectedApproverTypeState(undefined);
      return;
    }

    setSelectedNodeRoleState(undefined);
    setSelectedApproverTypeState(undefined);
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
      priority:
        typeof edgeData.properties?.priority === 'number'
          ? edgeData.properties.priority
          : undefined,
    });
  }

  function handleApproverDeptIdsChange(nextDeptIds: string[]) {
    const normalizedDeptIds = normalizeSelectedDeptIds(
      nextDeptIds,
      selectedApproverDeptIds,
      approverDeptParentIdMap,
      approverDeptDescendantIdsMap,
    );

    nodeForm.setFieldValue('approverIds', normalizedDeptIds);
  }

  function buildWorkflowSavePayload() {
    const currentGraphData = (logicFlowRef.current?.getGraphData() ?? initialWorkflowCanvasData) as WorkflowCanvasData;
    // 保存链路改为直接提交前端设计 JSON。
    // 这样后端接口升级后，前端不再需要反向推导 node/transition DTO，也能完整保留折线、锚点和 UI 属性。
    return {
      hasNodes: Array.isArray(currentGraphData.nodes) && currentGraphData.nodes.length > 0,
      workFlowJson: JSON.stringify(currentGraphData),
    };
  }

  async function handleSaveWorkflowDefinition() {
    if (readonlyMode) {
      return;
    }

    try {
      const values = await definitionForm.validateFields();
      const payload = buildWorkflowSavePayload();

      if (!payload.hasNodes) {
        message.warning('当前流程没有节点，无法保存');
        return;
      }

      setDefinitionSaving(true);

      if (currentDefinitionId) {
        await updateWorkflowDefinition({
          description: values.description?.trim() || undefined,
          id: currentDefinitionId,
          name: values.name.trim(),
          workFlowJson: payload.workFlowJson,
        });
        message.success('流程保存成功');
        return;
      }

      const createdDefinition = await createWorkflowDefinition({
        code: values.code.trim(),
        description: values.description?.trim() || undefined,
        name: values.name.trim(),
        workFlowJson: payload.workFlowJson,
      });

      setCurrentDefinitionId(createdDefinition.id);
      setSearchParams({ id: String(createdDefinition.id) }, { replace: true });
      message.success('流程创建成功');
    } catch (error) {
      if (isFormValidationError(error)) {
        return;
      }

      showErrorMessageOnce(error, '流程保存失败');
    } finally {
      setDefinitionSaving(false);
    }
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
    logicFlow.render(initialWorkflowCanvasData);
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

      if (readonlyMode) {
        setContextMenuState(null);
        setSelectedElement({
          id: data.id,
          type: 'node',
        });
        return;
      }

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

      if (readonlyMode) {
        setContextMenuState(null);
        setSelectedElement({
          id: data.id,
          type: 'edge',
        });
        return;
      }

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
  }, [readonlyMode]);

  useEffect(() => {
    const logicFlow = logicFlowRef.current;

    if (!logicFlow) {
      return;
    }

    // 详情态切换到 LogicFlow 静默模式，直接禁用节点/连线拖拽、锚点和键盘删除。
    // 这样仍然保留选中查看属性的能力，但不会误改流程图。
    logicFlow.updateEditConfig({
      isSilentMode: readonlyMode,
    });
    setContextMenuState(null);
    syncHistoryActionState();
  }, [readonlyMode]);

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
      setSelectedNodeRoleState(undefined);
      setSelectedApproverTypeState(undefined);
      return;
    }

    syncSelectedElementPanel();
  }, [edgeForm, nodeForm, selectedElement]);

  useEffect(() => {
    if (selectedApproverTypeState !== 'DEPT' || deptTreeOptions.length) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setDeptTreeOptionsLoading(true);
        const deptTree = await fetchDeptTree({ status: 1 });

        if (!cancelled) {
          setDeptTreeOptions(deptTree);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '组织树加载失败');
        }
      } finally {
        if (!cancelled) {
          setDeptTreeOptionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [deptTreeOptions.length, selectedApproverTypeState]);

  useEffect(() => {
    if (selectedApproverTypeState !== 'ROLE' || roleOptions.length) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setRoleOptionsLoading(true);
        const roleList = await fetchRoleList({ status: 1 });

        if (!cancelled) {
          setRoleOptions(roleList);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '角色列表加载失败');
        }
      } finally {
        if (!cancelled) {
          setRoleOptionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [roleOptions.length, selectedApproverTypeState]);

  useEffect(() => {
    if (selectedApproverTypeState !== 'USER' || userOptions.length) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setUserOptionsLoading(true);
        // 审批节点选择用户时优先加载启用状态用户，并限制在一页内满足当前配置场景。
        // 如果后续用户量明显增大，再把这里升级为远程搜索下拉。
        const pageResult = await fetchUserPage({
          pageNum: 1,
          pageSize: 200,
          status: 1,
        });

        if (!cancelled) {
          setUserOptions(pageResult.records);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '用户列表加载失败');
        }
      } finally {
        if (!cancelled) {
          setUserOptionsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedApproverTypeState, userOptions.length]);

  useEffect(() => {
    const currentApproverIds = nodeForm.getFieldValue('approverIds');

    if (
      selectedApproverTypeState === 'ROLE' ||
      selectedApproverTypeState === 'USER' ||
      selectedApproverTypeState === 'DEPT'
    ) {
      if (!Array.isArray(currentApproverIds)) {
        nodeForm.setFieldValue('approverIds', normalizeApproverIds(currentApproverIds));
      }
      return;
    }

    if (Array.isArray(currentApproverIds)) {
      // 审核人类型在“指定角色”和文本输入型配置之间切换时，统一在这里做值形态转换，
      // 避免 TextArea 收到数组值或多选下拉收到整段字符串。
      nodeForm.setFieldValue('approverIds', currentApproverIds.join(', '));
    }
  }, [nodeForm, selectedApproverTypeState]);

  useEffect(() => {
    const rawDefinitionId = Number(searchParams.get('id') ?? '');

    if (!Number.isFinite(rawDefinitionId) || rawDefinitionId <= 0) {
      setCurrentDefinitionId(null);
      definitionForm.setFieldsValue({
        code: '',
        description: '',
        name: '',
      });
      renderWorkflowGraph(initialWorkflowCanvasData as WorkflowCanvasData);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setDefinitionLoading(true);
        const detail = await fetchWorkflowDefinitionDetail(rawDefinitionId);

        if (cancelled) {
          return;
        }

        setCurrentDefinitionId(detail.id);
        definitionForm.setFieldsValue({
          code: detail.code,
          description: detail.description ?? '',
          name: detail.name,
        });
        renderWorkflowGraph(buildCanvasDataFromDefinition(detail));
      } catch (error) {
        if (!cancelled) {
          showErrorMessageOnce(error, '流程定义加载失败');
        }
      } finally {
        if (!cancelled) {
          setDefinitionLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [definitionForm, searchParams]);

  function clearWorkflowGraph() {
    if (readonlyMode) {
      return;
    }

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
    if (readonlyMode) {
      return;
    }

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
        // 当前交互只有审批节点支持时限设置，其余节点不再预置这组属性。
        remindAfterMinutes: material.nodeRole === 'APPROVAL' ? 30 : undefined,
        timeoutAfterMinutes: material.nodeRole === 'APPROVAL' ? 120 : undefined,
        timeoutStrategy: material.nodeRole === 'APPROVAL' ? 'NOTIFY_ONLY' : undefined,
      },
      text: material.text,
      type: material.type,
      x: 0,
      y: 0,
    });
  }

  function deleteContextMenuTarget() {
    if (readonlyMode) {
      return;
    }

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
    if (readonlyMode) {
      return;
    }

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
    if (readonlyMode) {
      return;
    }

    const logicFlow = logicFlowRef.current;

    if (!logicFlow?.history.redoAble()) {
      return;
    }

    logicFlow.redo();
    syncGraphSnapshot();
    syncHistoryActionState();
  }

  function handleNodeFormChange(changedValues: Partial<NodeFormValues>, allValues: NodeFormValues) {
    if (readonlyMode) {
      return;
    }

    if (typeof allValues.nodeRole === 'string') {
      setSelectedNodeRoleState(allValues.nodeRole as WorkflowNodeRoleValue);
    }
    const approverTypeChanged = Object.prototype.hasOwnProperty.call(changedValues, 'approverType');
    const nextApproverIds =
      approverTypeChanged
        ? []
        : normalizeApproverIds(allValues.approverIds);

    if (typeof allValues.approverType === 'string' || allValues.approverType === undefined) {
      if (allValues.approverType !== selectedApproverTypeState) {
        // 审核人类型切换后，旧的审核人数据语义已经不成立。
        // 这里强制清空，避免用户误把“角色ID”或“组织ID”沿用到新的审核人类型里。
        nodeForm.setFieldValue(
          'approverIds',
          allValues.approverType === 'ROLE' ||
            allValues.approverType === 'USER' ||
            allValues.approverType === 'DEPT'
            ? []
            : '',
        );
      }
      setSelectedApproverTypeState(allValues.approverType);
    }

    const logicFlow = logicFlowRef.current;

    if (!logicFlow || selectedElement?.type !== 'node') {
      return;
    }

    logicFlow.updateText(selectedElement.id, allValues.nodeName || '未命名节点');
    logicFlow.setProperties(selectedElement.id, {
      approveMode: allValues.approveMode,
      approverIds: nextApproverIds,
      approverType: allValues.approverType,
      nodeRole: allValues.nodeRole,
      remindAfterMinutes: allValues.remindAfterMinutes,
      timeoutAfterMinutes: allValues.timeoutAfterMinutes,
      timeoutStrategy: allValues.timeoutStrategy,
    });
    syncGraphSnapshot();
  }

  function handleEdgeFormChange(_: unknown, allValues: EdgeFormValues) {
    if (readonlyMode) {
      return;
    }

    const logicFlow = logicFlowRef.current;

    if (!logicFlow || selectedElement?.type !== 'edge') {
      return;
    }

    logicFlow.updateText(selectedElement.id, allValues.edgeName || '');
    logicFlow.setProperties(selectedElement.id, {
      conditionType: allValues.conditionType,
      expression: allValues.conditionExpression,
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
      description={
        readonlyMode
          ? '流程详情页仅允许查看流程图、节点属性和连线条件，不允许执行任何编辑操作。'
          : '流程定义页支持拖拽建模、节点与连线属性配置，并可将整个流程定义保存到后端。'
      }
      title={readonlyMode ? '流程详情' : '流程定义'}
    >
      <Form<DefinitionFormValues>
        disabled={readonlyMode}
        form={definitionForm}
        initialValues={{
          code: '',
          description: '',
          name: '',
        }}
        layout="vertical"
      >
        {/* 流程定义的基础信息和保存操作收拢到同一条工具线上。
            这样用户在新开标签页设计流程时，名称、编码、保存入口始终在同一视觉区域内，
            后续如果还要补“发布”“另存为”等操作，也可以继续在这一行右侧扩展。 */}
        <Row className="workflow-definition-toolbar" gutter={[16, 16]}>
          <Col lg={8} span={24} xl={7}>
            <Form.Item
              label="流程名称"
              name="name"
              rules={[{ required: true, message: '请输入流程名称' }]}
            >
              <Input placeholder="请输入流程名称" />
            </Form.Item>
          </Col>
          <Col lg={8} span={24} xl={7}>
            <Form.Item
              label="流程编码"
              name="code"
              rules={[{ required: true, message: '请输入流程编码' }]}
            >
              <Input
                disabled={Boolean(currentDefinitionId)}
                placeholder="请输入流程编码"
              />
            </Form.Item>
          </Col>
          <Col lg={8} span={24} xl={10}>
            {/* 保存按钮也放进 Form.Item，占位一行 label。
                这样它会和左右两个输入框按控件区对齐，不会被 label/extra 的高度影响。 */}
            <Form.Item
              className="workflow-definition-toolbar__action-item"
              label={<span aria-hidden="true">&nbsp;</span>}
            >
              <div className="workflow-definition-toolbar__actions">
                {!readonlyMode && (
                  <Button
                    loading={definitionSaving}
                    onClick={() => void handleSaveWorkflowDefinition()}
                    type="primary"
                  >
                    保存流程
                  </Button>
                )}
              </div>
            </Form.Item>
          </Col>
        </Row>
        {/* 描述字段单独占一行，避免把顶部工具线挤乱。
            后续如果要扩展分类、业务标识等补充信息，也可以继续沿用这一层全宽表单区。 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item label="流程描述" name="description">
              <Input.TextArea
                autoSize={{ maxRows: 3, minRows: 2 }}
                maxLength={500}
                placeholder="请输入流程描述"
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {definitionLoading && (
        <Alert
          showIcon
          message="正在加载流程定义，请稍候"
          style={{ marginBottom: 16 }}
          type="info"
        />
      )}

      <Row gutter={[16, 16]}>
        {!readonlyMode && (
          <Col lg={4} span={24}>
          <Card title="快捷操作">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button block disabled={!historyActionState.canUndo} onClick={undoCanvasChange}>
                撤销操作
              </Button>
              <Button block disabled={!historyActionState.canRedo} onClick={redoCanvasChange}>
                恢复操作
              </Button>
              <Button block danger onClick={clearWorkflowGraph}>
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
        )}

        <Col lg={readonlyMode ? (sidePanelVisible ? 18 : 24) : (sidePanelVisible ? 14 : 20)} span={24}>
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
              {contextMenuState && !readonlyMode && (
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
                    disabled={readonlyMode}
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
                          extra={
                            selectedApproverTypeState === 'ROLE'
                              ? '可多选角色，流程运行时按所选角色匹配审批人。'
                              : selectedApproverTypeState === 'USER'
                                ? '可多选用户，流程运行时将按所选用户发起审批。'
                                : selectedApproverTypeState === 'DEPT'
                                  ? '可多选组织，父子节点不能同时选中，选中逻辑与用户绑定组织保持一致。'
                              : '多个审核人可用英文逗号、中文逗号或换行分隔。'
                          }
                          label="审核人"
                          name="approverIds"
                        >
                          {selectedApproverTypeState === 'ROLE' ? (
                            <Select
                              loading={roleOptionsLoading}
                              mode="multiple"
                              optionFilterProp="label"
                              options={roleOptions.map((role) => ({
                                label: `${role.name} (${role.code})`,
                                value: String(role.id),
                              }))}
                              placeholder="请选择角色"
                            />
                          ) : selectedApproverTypeState === 'USER' ? (
                            <Select
                              loading={userOptionsLoading}
                              mode="multiple"
                              optionFilterProp="label"
                              options={userOptions.map((user) => ({
                                label: `${user.realName} (${user.username})`,
                                value: String(user.id),
                              }))}
                              placeholder="请选择用户"
                            />
                          ) : selectedApproverTypeState === 'DEPT' ? (
                            <TreeSelect
                              allowClear
                              loading={deptTreeOptionsLoading}
                              maxTagCount="responsive"
                              multiple
                              onChange={(value) => handleApproverDeptIdsChange((value as string[]) ?? [])}
                              placeholder="请选择组织"
                              showSearch
                              treeData={buildDeptTreeSelectData(deptTreeOptions, disabledApproverDeptIds)}
                              treeDefaultExpandAll
                            />
                          ) : (
                            <Input.TextArea
                              placeholder="例如：zhangsan, lisi"
                              rows={3}
                            />
                          )}
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
                    disabled={readonlyMode}
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
