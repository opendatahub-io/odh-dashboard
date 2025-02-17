export const modelCustomizationFormPageTitle = 'Instruct fine-tune run';
//TODO: add link to "Learn more about the LAB method"
export const modelCustomizationFormPageDescription =
  'InstructLab fine-tuning is a method which uses synthetic data generation (SDG) techniques and a structured taxonomy to create diverse, high-quality training datasets. Learn more about the LAB method';
export const getInvalidRedirectPath = (namespace: string): string =>
  `/modelCustomization/instructlab/${encodeURIComponent(namespace)}`;
