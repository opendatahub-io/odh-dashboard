import { ROLE_TEMPLATE_CATALOG } from './roleTemplateCatalog';

export const CUSTOM_ROLE_TRACKING_EVENTS = {
  CREATION_INITIATED: 'Custom Role Creation Initiated',
  VIEW_TOGGLED: 'Custom Role View Toggled',
  RULE_ADDED: 'Custom Role Rule Added',
  YAML_EXPORT_SELECTED: 'Custom Role YAML Export Selected',
  FORM_SUBMITTED: 'Custom Role Form Submitted',
  TEMPLATE_SELECTED: 'Custom Role Template Selected',
} as const;

export type CreationInitiatedProperties = {
  to: string;
  type: 'roles-list-page' | 'empty-state';
};

export type ViewToggledProperties = {
  targetView: 'form' | 'yaml';
  sourceView: 'form' | 'yaml';
};

export type RuleAddedProperties = {
  /** JSON-stringified array of API group names. */
  apiGroups: string;
  /** JSON-stringified array of resource type names. */
  resourceTypes: string;
  /** JSON-stringified array of verb names. */
  verbs: string;
  totalRulesCount: number;
  isEdit: boolean;
};

export type YamlExportSelectedProperties = {
  actionType: 'copy' | 'download';
};

export type TemplateSelectedProperties = {
  templateId: string;
  templateName: string;
  templateCategory: string;
  mode: 'select' | 'addRules';
  rulesAdded: number;
  hadExistingRules: boolean;
};

export type FormSubmittedProperties = {
  outcome: string;
  success?: boolean;
  errorCode?: string;
  yamlPreviewed: boolean;
  /** JSON-stringified array of export action types taken (e.g. ["copy","download"]). */
  yamlExportActions: string;
  totalTimeOnPageMs: number;
  totalRulesCount: number;
  currentView: 'form' | 'yaml';
  templateUsed: boolean;
  templateId: string;
};

export const findTemplateCategoryId = (templateId: string): string | undefined =>
  ROLE_TEMPLATE_CATALOG.find((cat) => cat.templates.some((t) => t.id === templateId))?.id;
