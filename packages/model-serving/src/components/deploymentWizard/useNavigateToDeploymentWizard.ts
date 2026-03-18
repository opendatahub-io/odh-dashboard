import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import { getDeploymentWizardRoute } from './utils';
import { useExtractFormDataFromDeployment } from './useExtractFormDataFromDeployment';
import { InitialWizardFormData } from './types';
import { type Deployment } from '../../../extension-points';

/**
 * Custom hook that provides a navigation function to the deployment wizard.
 * This hook handles loading form data from existing deployments and ensures
 * all data is ready before navigating to the wizard.
 *
 * @param deployment - Optional deployment object for editing existing deployments.
 *                     If provided, the hook will extract form data from this deployment
 *                     and wait for it to load before allowing navigation.
 * @param initialData - Optional initial data to prefill data in the wizard.
 * @param returnRouteValue - Optional return route value to use instead of the current location pathname.
 * @returns A memoized navigation function that takes a project name and navigates
 *          to the deployment wizard with the appropriate state data.
 *
 * @example
 * ```tsx
 * // For creating a new deployment
 * const navigateToWizard = useNavigateToDeploymentWizard();
 *
 * const handleCreate = () => {
 *   navigateToWizard('my-project');
 * };
 *
 * // For editing an existing deployment
 * const navigateToEdit = useNavigateToDeploymentWizard(existingDeployment);
 *
 * const handleEdit = () => {
 *   navigateToEdit('my-project');
 * };
 *
 * // For creating a new deployment with a custom return route
 * const navigateToWizard = useNavigateToDeploymentWizard(undefined, undefined,'/ai-hub/deployments/');
 *
 * const handleCreate = () => {
 *   navigateToWizard('my-project');
 * };
 * ```
 *
 * @remarks
 * - The hook automatically handles loading states when editing deployments
 * - Navigation is delayed if form data is still loading
 * - Errors during form data extraction prevent navigation
 * - The hook includes return route information for proper navigation flow
 */
export const useNavigateToDeploymentWizard = (
  deployment?: Deployment | null,
  initialData?: InitialWizardFormData | null,
  returnRouteValue?: string,
  cancelReturnRouteValue?: string,
): ((projectName?: string, initialDataOnNavigate?: InitialWizardFormData | null) => void) => {
  const navigate: NavigateFunction = useNavigate();
  const isYAMLViewerEnabled = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;

  // Load hooks needed for the deployment wizard
  const { formData, loaded, error } = useExtractFormDataFromDeployment(deployment);
  const location = useLocation();
  let returnRoute = returnRouteValue ?? location.pathname;
  if (returnRoute.includes('projects')) {
    returnRoute += '?section=model-server';
  }
  let cancelReturnRoute = cancelReturnRouteValue ?? location.pathname;
  if (cancelReturnRoute.includes('projects')) {
    cancelReturnRoute += '?section=model-server';
  }

  // Track pending navigation requests while waiting for form data to load
  const [pendingNavigate, setPendingNavigate] = React.useState<
    { projectName?: string } | undefined
  >(undefined);

  // Extract the navigation logic into a reusable callback
  const executeNavigation = React.useCallback(
    (projectName?: string, initialDataOnNavigate?: InitialWizardFormData | null): void => {
      const mergedInitialData: InitialWizardFormData = {
        ...(formData ?? {}),
        ...(initialData ?? {}),
        ...(initialDataOnNavigate ?? {}),
        // If extraction failed for an existing deployment, auto-fallback to YAML edit mode
        viewMode: deployment && error && isYAMLViewerEnabled ? 'yaml-edit' : undefined,
      };

      navigate(getDeploymentWizardRoute(), {
        state: {
          initialData: mergedInitialData,
          existingDeployment: deployment,
          returnRoute,
          cancelReturnRoute,
          projectName,
        },
      });
    },
    [
      navigate,
      formData,
      initialData,
      deployment,
      returnRoute,
      cancelReturnRoute,
      error,
      isYAMLViewerEnabled,
    ],
  );

  // Execute pending navigation when form data finishes loading
  React.useEffect(() => {
    if (pendingNavigate && loaded) {
      executeNavigation(pendingNavigate.projectName);
      setPendingNavigate(undefined);
    }
  }, [pendingNavigate, loaded, executeNavigation]);

  // Memoize the navigation function to prevent unnecessary re-renders
  return React.useCallback(
    (projectName?: string, initialDataOnNavigate?: InitialWizardFormData | null): void => {
      // Log extraction errors but allow navigation with YAML fallback
      if (deployment && error) {
        console.warn(
          'useNavigateToDeploymentWizard: Extraction error, will fallback to YAML mode:',
          error.message,
        );
      }

      // If we're editing a deployment and form data isn't loaded yet, queue the navigation
      if (deployment && !loaded) {
        console.info(
          'useNavigateToDeploymentWizard: Form data is still loading, navigation queued',
        );
        setPendingNavigate({ projectName });
        return;
      }

      // Navigate immediately if data is ready or no deployment is being edited
      executeNavigation(projectName, initialDataOnNavigate);
    },
    [executeNavigation, loaded, error, deployment],
  );
};
