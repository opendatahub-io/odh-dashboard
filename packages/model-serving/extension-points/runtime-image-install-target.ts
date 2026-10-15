import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { RuntimeImageInstallActionData } from '@mf/modelRegistry/extension-points';

export type RuntimeImageInstallTargetId =
  keyof RuntimeImageInstallActionData['deploymentResources'];

// RuntimeImageInstallPage mounts install-target extensions. Each provides two things to that page's wizard:
// - Step 1: a radio button option for how to install the runtime
// - Step 2: a form for installing when that option is selected
// The kserve and llmd-serving packages provide install-target extensions for ServingRuntime Templates and LLMInferenceServiceConfigs respectively.

export type RuntimeImageInstallTargetProps = {
  targetData: NonNullable<
    RuntimeImageInstallActionData['deploymentResources'][RuntimeImageInstallTargetId]
  >;
  onBack: () => void;
  cancelReturnRoute: string;
};

export type RuntimeImageInstallTargetExtension = Extension<
  'model-serving.runtime-image/install-target',
  {
    id: RuntimeImageInstallTargetId;
    // If needed in the future, we could replace label/description/selectedState with another ComponentCodeRef
    // for the full radio button and its body, but that involves unnecessary duplication at this time
    label: string;
    // Target phrase used in the single-supported-target explanation.
    installTargetName: string;
    description: string;
    selectedState: {
      listName: string;
      description: string;
    };
    configureStepLabel: string;
    component: ComponentCodeRef<RuntimeImageInstallTargetProps>;
  }
>;

export const isRuntimeImageInstallTargetExtension = (
  extension: Extension,
): extension is RuntimeImageInstallTargetExtension =>
  extension.type === 'model-serving.runtime-image/install-target';
