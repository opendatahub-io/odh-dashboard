export enum AuthPoliciesFilterOptions {
  keyword = 'keyword',
}

export const authPoliciesFilterOptions = {
  [AuthPoliciesFilterOptions.keyword]: 'Keyword',
};

export type AuthPoliciesFilterDataType = Record<AuthPoliciesFilterOptions, string | undefined>;

export const initialAuthPoliciesFilterData: AuthPoliciesFilterDataType = {
  [AuthPoliciesFilterOptions.keyword]: '',
};
