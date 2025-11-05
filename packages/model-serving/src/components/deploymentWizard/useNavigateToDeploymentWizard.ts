import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import React from 'react';
import { getDeploymentWizardRoute } from './utils';
import { useExtractFormDataFromDeployment } from './useExtractFormDataFromDeployment';
<<<<<<< HEAD
import { InitialWizardFormData } from './types';
=======
import { type InitialWizardFormData } from './types';
>>>>>>> 36c95bd96 (Allow registry to deploy with the wizard)
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
): ((projectName?: string) => void) => {
  const navigate: NavigateFunction = useNavigate();

  // Load hooks needed for the deployment wizard
  const { formData, loaded, error } = useExtractFormDataFromDeployment(deployment);
  const location = useLocation();
  let returnRoute = returnRouteValue ?? location.pathname;
  if (returnRoute.includes('projects')) {
    returnRoute += '?section=model-server';
  }
  const cancelReturnRoute = cancelReturnRouteValue;

  // Track pending navigation requests while waiting for form data to load
  const [pendingNavigate, setPendingNavigate] = React.useState<
    { projectName?: string } | undefined
  >(undefined);

  // Extract the navigation logic into a reusable callback
  const executeNavigation = React.useCallback(
    (projectName?: string, initialDataOnNavigate?: InitialWizardFormData | null): void => {
      const mergedInitialData = {
        ...(formData ?? {}),
        ...(initialData ?? {}),
        ...(initialDataOnNavigate ?? {}),
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
    [navigate, formData, initialData, deployment, returnRoute, cancelReturnRoute],
  );

  // Execute pending navigation when form data finishes loading
  React.useEffect(() => {
    if (pendingNavigate && loaded && !error) {
      executeNavigation(pendingNavigate.projectName);
      setPendingNavigate(undefined);
    }
  }, [pendingNavigate, loaded, error, executeNavigation]);

  // Memoize the navigation function to prevent unnecessary re-renders
  return React.useCallback(
    (projectName?: string, initialData?: InitialWizardFormData | null): void => {
      // If there's an error loading form data, don't navigate
      if (deployment && error) {
        console.error('useNavigateToDeploymentWizard: Failed to load form data:', error.message);
        return;
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
      executeNavigation(projectName, initialData);
    },
    [executeNavigation, loaded, error, deployment],
  );
};
