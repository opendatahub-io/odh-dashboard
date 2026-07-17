import { ROLE_TEMPLATE_CATALOG } from './roleTemplateCatalog';

export const CUSTOM_ROLE_TRACKING_EVENTS = {
  CREATION_INITIATED: 'Custom Role Creation Initiated',
  VIEW_TOGGLED: 'Custom Role View Toggled',
  RULE_ADDED: 'Custom Role Rule Added',
  YAML_EXPORT_SELECTED: 'Custom Role YAML Export Selected',
  FORM_SUBMITTED: 'Custom Role Form Submitted',
  TEMPLATE_SELECTED: 'Custom Role Template Selected',
} as const;

export const findTemplateCategoryId = (templateId: string): string | undefined =>
  ROLE_TEMPLATE_CATALOG.find((cat) => cat.templates.some((t) => t.id === templateId))?.id;
