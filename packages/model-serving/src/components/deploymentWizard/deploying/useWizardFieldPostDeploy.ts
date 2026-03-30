import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from '../types';
import { isWizardFieldPostDeployExtension, type Deployment } from '../../../../extension-points';
import { useActiveFields } from '../dynamicFormUtils';

/** A record of a post-deploy extension that failed, including the field it belongs to. */
export type PostDeployFailure = { fieldId: string; error: Error };

/**
 * Hook that returns an async function to run all active post-deploy extensions after
 * a deployment is saved. Each extension receives the field's current data, the newly
 * saved model resource (which now has a uid), and the original deployment (if editing).
 *
 * Post-deploy extensions are only executed if their associated WizardField2 is active.
 * Errors thrown by individual extensions are caught and collected as PostDeployFailure
 * entries; subsequent extensions still run and the returned promise always resolves so these errors don't block submission and closing of the wizard
 *
 * @param wizardState - The current wizard form state at the point of submission
 */
export const useWizardFieldPostDeploy = (
  wizardState: WizardFormData['state'],
): {
  runPostDeploy: (
    deployedModel: Deployment['model'],
    existingDeployment?: Deployment,
  ) => Promise<PostDeployFailure[]>;
  postDeployExtensionsLoaded: boolean;
  postDeployExtensionErrors: Error[];
} => {
  const [postDeployExtensions, postDeployExtensionsLoaded, postDeployExtensionErrors] =
    useResolvedExtensions(isWizardFieldPostDeployExtension);

  // const [fieldExtensions] = useResolvedExtensions(isWizardField2Extension);

  // const activeFieldIds = React.useMemo(
  //   () =>
  //     new Set(
  //       fieldExtensions
  //         .filter((ext) => ext.properties.field.isActive(wizardState))
  //         .map((ext) => ext.properties.field.id),
  //     ),
  //   [fieldExtensions, wizardState],
  // );

  const activeFields = useActiveFields(wizardState);

  const activePostDeployExtensions = React.useMemo(
    () =>
      postDeployExtensions.filter((ext) =>
        activeFields.some((field) => field.id === ext.properties.fieldId),
      ),
    [postDeployExtensions, activeFields],
  );

  const runPostDeploy = React.useCallback(
    async (
      deployedModel: Deployment['model'],
      existingDeployment?: Deployment,
    ): Promise<PostDeployFailure[]> => {
      const failures: PostDeployFailure[] = [];
      for (const ext of activePostDeployExtensions) {
        const { fieldId } = ext.properties;
        const fieldData: unknown = wizardState[fieldId];
        try {
          await ext.properties.postDeploy(fieldData, deployedModel, existingDeployment);
        } catch (err) {
          failures.push({ fieldId, error: err instanceof Error ? err : new Error(String(err)) });
        }
      }
      return failures;
    },
    [activePostDeployExtensions, wizardState],
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
