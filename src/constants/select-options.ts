// 这个文件专门收口“当前没有字典接口、但前端必须先使用”的静态下拉数据。
// 后续如果后端补了统一字典接口，可以优先保持 key 不变，再把数据源从静态常量切到接口请求。

export type OrgTypeCode = 'GROUP' | 'COMPANY' | 'DEPT' | 'POST';
export type DataScopeCode =
  | 'ALL'
  | 'CUSTOM_DEPT'
  | 'CURRENT_AND_CHILD_DEPT'
  | 'CURRENT_DEPT'
  | 'SELF';
export type MenuTypeCode = 'DIRECTORY' | 'MENU' | 'BUTTON';

// 组织类型下拉先按后端约定的 key/value 维护：
// key 传给接口，label 展示给用户，避免页面层自己写魔法字符串。
export const ORG_TYPE_OPTIONS: Array<{ label: string; value: OrgTypeCode }> = [
  { label: '集团', value: 'GROUP' },
  { label: '公司', value: 'COMPANY' },
  { label: '部门', value: 'DEPT' },
  { label: '岗位', value: 'POST' },
];

const ORG_TYPE_LABEL_MAP: Record<OrgTypeCode, string> = {
  GROUP: '集团',
  COMPANY: '公司',
  DEPT: '部门',
  POST: '岗位',
};
// 此处给真实接口使用所以不用OrgTypeCode，真实后端返回的数据可能是 空值、非预期值、新增了前端还没同步的枚举值
export function getOrgTypeLabel(orgType?: string) {
  // 处理 参数未传递 undefined 空字符串'' null 情况
  if (!orgType) {
    return '-';
  }

  return ORG_TYPE_LABEL_MAP[orgType as OrgTypeCode] ?? orgType;
}

// 菜单管理页先用静态类型字典，等后端有统一字典接口后再切换数据源。
export const MENU_TYPE_OPTIONS: Array<{ label: string; value: MenuTypeCode }> = [
  { label: '目录', value: 'DIRECTORY' },
  { label: '菜单', value: 'MENU' },
  { label: '按钮', value: 'BUTTON' },
];

const MENU_TYPE_LABEL_MAP: Record<MenuTypeCode, string> = {
  DIRECTORY: '目录',
  MENU: '菜单',
  BUTTON: '按钮',
};

export function getMenuTypeLabel(type?: string) {
  if (!type) {
    return '-';
  }

  return MENU_TYPE_LABEL_MAP[type as MenuTypeCode] ?? String(type);
}

export const VISIBLE_STATUS_OPTIONS: Array<{ label: string; value: 0 | 1 }> = [
  { label: '隐藏', value: 0 },
  { label: '显示', value: 1 },
];

// 菜单图标当前先维护一组后台常用基础图标。
// 这里返回“图标标识 + 中文名称”的静态选项，页面层只负责渲染，不需要自己再拼文案。
// 如果后续继续扩展菜单图标，优先在这里补齐稳定的 value，避免数据库里存的 icon 标识频繁变更。
export const MENU_ICON_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '工作台', value: 'dashboard' },
  // 这组 workflow 语义图标优先给审批、流程设计、流程实例、待办/已办等菜单复用。
  // 先把稳定 key 固定下来，后续即使替换具体视觉图标，也不需要回改数据库里已保存的 icon 值。
  { label: '流程中心', value: 'workflow' },
  { label: '流程设计', value: 'workflow-design' },
  { label: '流程节点', value: 'workflow-node' },
  { label: '流程实例', value: 'workflow-instance' },
  { label: '发起流程', value: 'workflow-launch' },
  { label: '待办任务', value: 'workflow-todo' },
  { label: '已办任务', value: 'workflow-done' },
  { label: '审批记录', value: 'workflow-audit' },
  { label: '抄送消息', value: 'workflow-copy' },
  { label: '应用', value: 'appstore' },
  { label: '设置', value: 'setting' },
  { label: '审计', value: 'audit' },
  { label: '接口', value: 'api' },
  { label: '告警', value: 'alert' },
  { label: '文档', value: 'book' },
  { label: '构建', value: 'build' },
  { label: '管控', value: 'control' },
  { label: '云服务', value: 'cloud' },
  { label: '数据源', value: 'database' },
  { label: '监控', value: 'desktop' },
  { label: '安全', value: 'safety' },
  { label: '工具', value: 'tool' },
  { label: '日历', value: 'calendar' },
  { label: '列表', value: 'bars' },
  { label: '报表', value: 'barchart' },
  { label: '分析', value: 'piechart' },
  { label: '集群', value: 'cluster' },
  { label: '发布', value: 'deployment' },
  { label: '方案', value: 'solution' },
  { label: '消息', value: 'mail' },
  { label: '项目', value: 'project' },
  { label: '档案', value: 'profile' },
  { label: '商城', value: 'shop' },
  { label: '筛选', value: 'sliders' },
  { label: '清单', value: 'unordered' },
  { label: '用户', value: 'user' },
  { label: '团队', value: 'team' },
  { label: '组织', value: 'apartment' },
  { label: '收件箱', value: 'inbox' },
  { label: '代办箱', value: 'schedule' },
  { label: '查询箱', value: 'search' },
  { label: '通知', value: 'notification' },
  { label: '内容', value: 'read' },
  { label: '锁定', value: 'lock' },
  { label: '表单', value: 'form' },
  { label: '标签', value: 'tag' },
  { label: '文件', value: 'file' },
];

// 角色数据权限下拉同样先由前端静态维护。
// 对页面层只暴露 key/value，避免把后端数字枚举扩散到表单和组件里。
export const DATA_SCOPE_OPTIONS: Array<{ key: DataScopeCode; value: string }> = [
  { key: 'ALL', value: '全部数据' },
  { key: 'CUSTOM_DEPT', value: '自定义部门' },
  { key: 'CURRENT_AND_CHILD_DEPT', value: '本部门及子部门' },
  { key: 'CURRENT_DEPT', value: '仅本部门' },
  { key: 'SELF', value: '仅本人数据' },
];

const DATA_SCOPE_CODE_TO_LABEL_MAP: Record<DataScopeCode, string> = {
  ALL: '全部数据',
  CUSTOM_DEPT: '自定义部门',
  CURRENT_AND_CHILD_DEPT: '本部门及子部门',
  CURRENT_DEPT: '仅本部门',
  SELF: '仅本人数据',
};

export function getDataScopeLabelByCode(dataScopeCode?: string) {
  if (!dataScopeCode) {
    return '-';
  }

  return DATA_SCOPE_CODE_TO_LABEL_MAP[dataScopeCode as DataScopeCode] ?? dataScopeCode;
}
