import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import React from 'react';
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

  // Memoize the navigation function to prevent unnecessary re-renders
  return React.useCallback(
    (projectName?: string): void => {
      // If we're editing a deployment, wait for form data to load
      if (deployment && !loaded) {
        console.warn(
          'useNavigateToDeploymentWizard: Form data is still loading, navigation delayed',
        );
        return;
      }

      // If there's an error loading form data, don't navigate
      if (deployment && error) {
        console.error('useNavigateToDeploymentWizard: Failed to load form data:', error.message);
        return;
      }

      const mergedInitialData = {
        ...(formData ?? {}),
        ...(initialData ?? {}),
      };
      // Navigate to deployment wizard with state data
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
    [navigate, formData, initialData, loaded, error, deployment, returnRoute, cancelReturnRoute],
  );
};
