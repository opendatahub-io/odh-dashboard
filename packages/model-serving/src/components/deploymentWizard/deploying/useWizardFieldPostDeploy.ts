import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from '../../../shared/types/form-data';
import { type Deployment } from '../../../../extension-points';
import { isWizardFieldDeploymentFunctionsExtension } from '../../../../extension-points/deployment-wizard';
import { useActiveFields } from '../dynamicFormUtils';

export type RunPostDeployFns = (
  deployedModel: Deployment,
  existingDeployment?: Deployment,
  dryRun?: boolean,
) => Promise<void>;

/**
 * Hook that returns an async function to run all active post-deploy extensions after
 * a deployment is saved. Each extension receives the field's current data, the newly
 * saved model resource (which now has a uid), and the original deployment (if editing).
 *
 * Post-deploy extensions are only executed if their associated WizardField2 is active.
 * On a real (non-dry) run, errors thrown by individual extensions are caught; subsequent
 * extensions still run and the returned promise resolves so errors don't block submission
 * and closing of the wizard. On a dry run, errors are rethrown so the caller can abort
 * before any cluster state is changed.
 * @param wizardState - The current wizard form state at the point of submission
 */
export const useWizardFieldPostDeploy = (
  wizardState: WizardFormData['state'],
): {
  runPostDeploy: RunPostDeployFns;
  postDeployExtensionsLoaded: boolean;
  postDeployExtensionErrors: Error[];
} => {
  const [postDeployExtensions, postDeployExtensionsLoaded, postDeployExtensionErrors] =
    useResolvedExtensions(isWizardFieldDeploymentFunctionsExtension);

  const activeFields = useActiveFields(wizardState);

  const activePostDeployExtensions = React.useMemo(
    () =>
      postDeployExtensions.filter((ext) =>
        activeFields.some((field) => field.id === ext.properties.fieldId),
      ),
    [postDeployExtensions, activeFields],
  );

  const runPostDeploy = React.useCallback<RunPostDeployFns>(
    async (
      deployedModel: Deployment,
      existingDeployment?: Deployment,
      dryRun?: boolean,
    ): Promise<void> => {
      for (const ext of activePostDeployExtensions) {
        const { fieldId } = ext.properties;
        const fieldData: unknown = wizardState[fieldId];
        try {
          if (typeof ext.properties.postDeploy === 'function') {
            await ext.properties.postDeploy(fieldData, deployedModel, existingDeployment, dryRun);
          }
        } catch (error) {
          if (dryRun) {
            // Dry runs validate before any cluster writes happen -- let the failure propagate
            // so the deployment is aborted instead of partially applied.
            throw error;
          }
          postDeployExtensionErrors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
    [activePostDeployExtensions, wizardState, postDeployExtensionErrors],
  );

  return React.useMemo(
    () => ({
      runPostDeploy,
      postDeployExtensionsLoaded,
      postDeployExtensionErrors: postDeployExtensionErrors.filter(
        (error): error is Error => error instanceof Error,
      ),
    }),
    [runPostDeploy, postDeployExtensionsLoaded, postDeployExtensionErrors],
  );
};
