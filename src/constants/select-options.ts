// 这个文件专门收口“当前没有字典接口、但前端必须先使用”的静态下拉数据。
// 后续如果后端补了统一字典接口，可以优先保持 key 不变，再把数据源从静态常量切到接口请求。

export type OrgTypeCode = 'GROUP' | 'COMPANY' | 'DEPT' | 'POST';
export type DataScopeCode =
  | 'ALL'
  | 'CUSTOM_DEPT'
  | 'CURRENT_AND_CHILD_DEPT'
  | 'CURRENT_DEPT'
  | 'SELF';

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
