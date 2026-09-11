import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import { applyConfigRef, createLocalConfigName, preDeployConfigCopy } from './configs';
import {
  ACCELERATOR_CONFIG_REF_ANNOTATION,
  LLMInferenceServiceConfigKind,
  type LLMdDeployment,
} from '../types';
import { ACCELERATOR_CONFIG_DEFAULT } from '../const';
import type { AcceleratorConfigFieldData } from '../wizardFields/AcceleratorConfigField';

const isDefaultPlaceholder = (c: string | LLMInferenceServiceConfigKind): boolean =>
  c === ACCELERATOR_CONFIG_DEFAULT;

export const applyAcceleratorConfig = (
  deployment: LLMdDeployment,
  fieldData?: AcceleratorConfigFieldData,
): LLMdDeployment =>
  applyConfigRef(deployment, fieldData, {
    annotationKey: ACCELERATOR_CONFIG_REF_ANNOTATION,
    configName: createLocalConfigName,
    isDefaultPlaceholder,
  });

export const preDeployAcceleratorConfig = (
  fieldData: AcceleratorConfigFieldData,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<LLMdDeployment>,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<LLMdDeployment>> =>
  preDeployConfigCopy(
    { annotationKey: ACCELERATOR_CONFIG_REF_ANNOTATION, isDefaultPlaceholder },
    fieldData,
    deployment,
    existingDeployment,
    dryRun,
  );

export const extractAcceleratorConfig = (
  deployment: LLMdDeployment,
): AcceleratorConfigFieldData | undefined => {
  const configRef = deployment.model.metadata.annotations?.[ACCELERATOR_CONFIG_REF_ANNOTATION];
  if (!configRef) {
    return undefined;
  }
  return { configRef };
};
