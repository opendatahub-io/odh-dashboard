import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Deployment } from 'extension-points';
import { useExtractFormDataFromDeployment } from './useExtractFormDataFromDeployment';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';

/**
 * Hook that provides a callback to refresh the wizard page with the latest deployment data.
 * This is useful when a 409 conflict error occurs and the user needs to get the latest version.
 *
 * The hook watches the ModelDeploymentsContext for updates and extracts fresh form data
 * from the latest version of the deployment. When onRefresh is called, it navigates
 * with both the updated deployment and re-extracted form data.
 *
 * @param existingDeployment - The deployment being edited (undefined for new deployments)
 * @returns A callback that re-navigates to the wizard with fresh deployment data, or undefined if not editing
 */
export const useRefreshWizardPage = (
  existingDeployment: Deployment | undefined,
): (() => void) | undefined => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deployments } = React.useContext(ModelDeploymentsContext);

  // Find the latest version of the deployment from the watched context
  const latestDeployment = React.useMemo(() => {
    if (!existingDeployment) {
      return undefined;
    }

    const deploymentName = existingDeployment.model.metadata.name;
    const deploymentNamespace = existingDeployment.model.metadata.namespace;

    return deployments?.find(
      (d) =>
        d.model.metadata.name === deploymentName &&
        d.model.metadata.namespace === deploymentNamespace,
    );
  }, [existingDeployment, deployments]);

  // Extract form data from the latest deployment so it's ready when refresh is clicked
  const { formData: latestFormData } = useExtractFormDataFromDeployment(latestDeployment);

  const onRefresh = React.useCallback(() => {
    if (!existingDeployment) {
      return;
    }

    // Re-navigate to the wizard with the updated deployment and fresh form data
    // Include a refreshKey to force the wizard component to re-mount with the new data
    navigate(location.pathname, {
      replace: true,
      state: {
        ...location.state,
        existingDeployment: latestDeployment ?? existingDeployment,
        initialData: latestFormData,
        refreshKey: Date.now(),
      },
    });
  }, [
    existingDeployment,
    latestDeployment,
    latestFormData,
    navigate,
    location.pathname,
    location.state,
  ]);

  // Only return the callback when editing an existing deployment
  return existingDeployment ? onRefresh : undefined;
};
