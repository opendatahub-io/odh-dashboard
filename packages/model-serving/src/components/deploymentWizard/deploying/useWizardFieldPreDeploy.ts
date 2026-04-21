import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from '../types';
import {
  isWizardFieldDeploymentFunctionsExtension,
  type Deployment,
} from '../../../../extension-points';
import { useActiveFields } from '../dynamicFormUtils';

/**
 * Hook that returns an async function to dry-run all active pre-deploy extensions before
 * a deployment is saved. Each extension receives the field's current data, the full wizard
 * state, and the assembled (not-yet-created) model resource.
 *
 * Pre-deploy extensions are only executed if their associated WizardField2 is active.
 * Errors thrown by extensions propagate and block the deployment — use this for
 * validating that side-effect resources (e.g. MaaSModelRef) can be created without conflicts.
 *
 * @param wizardState - The current wizard form state at the point of submission
 */
export const useWizardFieldPreDeploy = (
  wizardState: WizardFormData['state'],
): {
  runPreDeploy: (deployment: Deployment, existingDeployment?: Deployment) => Promise<Deployment>;
  preDeployExtensionsLoaded: boolean;
} => {
  const [preDeployExtensions, preDeployExtensionsLoaded] = useResolvedExtensions(
    isWizardFieldDeploymentFunctionsExtension,
  );

  const activeFields = useActiveFields(wizardState);

  const activePreDeployExtensions = React.useMemo(
    () =>
      preDeployExtensions.filter((ext) =>
        activeFields.some((field) => field.id === ext.properties.fieldId),
      ),
    [preDeployExtensions, activeFields],
  );

  const runPreDeploy = React.useCallback(
    async (deployment: Deployment, existingDeployment?: Deployment): Promise<Deployment> => {
      let current = deployment;
      for (const ext of activePreDeployExtensions) {
        const { fieldId } = ext.properties;
        const fieldData: unknown = wizardState[fieldId];
        current = await ext.properties.preDeploy(
          fieldData,
          wizardState,
          current,
          existingDeployment,
        );
      }
      return current;
    },
    [activePreDeployExtensions, wizardState],
  );

  return React.useMemo(
    () => ({ runPreDeploy, preDeployExtensionsLoaded }),
    [runPreDeploy, preDeployExtensionsLoaded],
  );
};
