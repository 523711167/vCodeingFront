// 这个文件专门收口“当前没有字典接口、但前端必须先使用”的静态下拉数据。
// 后续如果后端补了统一字典接口，可以优先保持 key 不变，再把数据源从静态常量切到接口请求。

export type OrgTypeCode = 'GROUP' | 'COMPANY' | 'DEPT' | 'POST';

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
