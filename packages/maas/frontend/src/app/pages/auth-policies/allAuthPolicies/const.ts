export enum AuthPoliciesFilterOptions {
  keyword = 'keyword',
  phase = 'phase',
}

export const authPoliciesFilterOptions = {
  [AuthPoliciesFilterOptions.keyword]: 'Keyword',
  [AuthPoliciesFilterOptions.phase]: 'Phase',
};

export type AuthPoliciesFilterDataType = Record<AuthPoliciesFilterOptions, string | undefined>;

export const initialAuthPoliciesFilterData: AuthPoliciesFilterDataType = {
  [AuthPoliciesFilterOptions.keyword]: '',
  [AuthPoliciesFilterOptions.phase]: '',
};
