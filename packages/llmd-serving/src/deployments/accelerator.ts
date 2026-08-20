import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import { applyConfigRef, createLocalConfigName, preDeployConfigCopy } from './configs';
import { ACCELERATOR_CONFIG_REF_ANNOTATION, type LLMdDeployment } from '../types';
import {
  ACCELERATOR_CONFIG_DEFAULT,
  type AcceleratorConfigFieldData,
} from '../wizardFields/AcceleratorConfigField';

const isSentinel = (c: unknown): boolean => c === ACCELERATOR_CONFIG_DEFAULT;

export const applyAcceleratorConfig = (
  deployment: LLMdDeployment,
  fieldData?: AcceleratorConfigFieldData,
): LLMdDeployment =>
  applyConfigRef(deployment, fieldData, {
    annotationKey: ACCELERATOR_CONFIG_REF_ANNOTATION,
    configName: createLocalConfigName,
    isSentinel,
  });

export const preDeployAcceleratorConfig = (
  fieldData: AcceleratorConfigFieldData,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<LLMdDeployment>,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<LLMdDeployment>> =>
  preDeployConfigCopy(
    { annotationKey: ACCELERATOR_CONFIG_REF_ANNOTATION, isSentinel },
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
