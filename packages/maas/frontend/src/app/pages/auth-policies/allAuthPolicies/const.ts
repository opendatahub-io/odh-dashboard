export enum AuthPoliciesFilterOptions {
  model = 'model',
  group = 'group',
  policy = 'policy',
}

/** MaaS governance authorization policies tab: Model / Group / Authorization policy typeahead selects. */
export const authPoliciesFilterOptions = {
  [AuthPoliciesFilterOptions.model]: 'Model',
  [AuthPoliciesFilterOptions.group]: 'Group',
  [AuthPoliciesFilterOptions.policy]: 'Authorization policy',
};

export type AuthPoliciesFilterSelection = { label: string; value: string };

export type AuthPoliciesFilterDataType = Record<
  AuthPoliciesFilterOptions,
  string | AuthPoliciesFilterSelection | undefined
>;

export const initialAuthPoliciesFilterData: AuthPoliciesFilterDataType = {
  [AuthPoliciesFilterOptions.model]: undefined,
  [AuthPoliciesFilterOptions.group]: undefined,
  [AuthPoliciesFilterOptions.policy]: undefined,
};
