import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Skeleton,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import useManageTrustyAICR from '#~/concepts/trustyai/useManageTrustyAICR';
import { useTrustySettingsAccessAllowed } from '#~/concepts/trustyai/content/useTrustySettingsAccessAllowed';
import { TrustyInstallState } from '#~/concepts/trustyai/types';
import TrustyAIInstalledState from '#~/concepts/trustyai/content/statusStates/TrustyAIInstalledState';
import TrustyAIUninstalledState from '#~/concepts/trustyai/content/statusStates/TrustyAIUninstalledState';

type UseTrustyCRState = {
  action: React.ReactNode;
  status?: React.ReactNode;
};

const useTrustyCRState = (project: ProjectKind): UseTrustyCRState => {
  const namespace = project.metadata.name;
  const { statusState, installCRForExistingDB, installCRForNewDB, deleteCR } =
    useManageTrustyAICR(namespace);

  const { loaded: accessLoaded, allowed } = useTrustySettingsAccessAllowed(namespace);

  if (!accessLoaded) {
    return {
      action: <Skeleton data-testid="trustyai-permissions-loading" height="35px" width="250px" />,
    };
  }

  let action: React.ReactNode;
  let status: React.ReactNode;
  switch (statusState.type) {
    case TrustyInstallState.INFRA_ERROR:
    case TrustyInstallState.CR_ERROR:
      action = <TrustyAIInstalledState onDelete={deleteCR} permissionDenied={!allowed} />;
      status = (
        <Alert
          variant="danger"
          title="TrustyAI service error"
          isLiveRegion
          isInline
          data-testid="trustyai-service-error"
        >
          <p>{statusState.message}</p>
          <p>Uninstall and try again, or contact your administrator.</p>
        </Alert>
      );
      break;
    case TrustyInstallState.INSTALLED:
      action = <TrustyAIInstalledState onDelete={deleteCR} permissionDenied={!allowed} />;
      status = statusState.showSuccess && (
        <Alert
          data-testid="trustyai-service-installed-alert"
          variant="success"
          title="TrustyAI installed"
          isLiveRegion
          isInline
          actionClose={
            statusState.onDismissSuccess && (
              <AlertActionCloseButton onClose={statusState.onDismissSuccess} />
            )
          }
        >
          You can view TrustyAI metrics in the model metrics screen. If you need to make changes,
          delete the deployment and start over.
        </Alert>
      );
      break;
    case TrustyInstallState.LOADING_INITIAL_STATE:
      action = <Skeleton data-testid="trustyai-initializing-state" height="35px" width="250px" />;
      break;
    case TrustyInstallState.INSTALLING:
      action = <TrustyAIInstalledState onDelete={deleteCR} permissionDenied={!allowed} />;
      status = (
        <Split hasGutter data-testid="trustyai-installing-state">
          <SplitItem>
            <Spinner size="lg" />
          </SplitItem>
          <SplitItem>Installing TrustyAI...</SplitItem>
        </Split>
      );
      break;
    case TrustyInstallState.UNINSTALLING:
      action = (
        <TrustyAIInstalledState uninstalling onDelete={deleteCR} permissionDenied={!allowed} />
      );
      break;
    case TrustyInstallState.UNINSTALLED:
    default:
      action = (
        <TrustyAIUninstalledState
          namespace={namespace}
          onInstallNewDB={installCRForNewDB}
          onInstallExistingDB={installCRForExistingDB}
          permissionDenied={!allowed}
        />
      );
  }

  return { action, status };
};

export default useTrustyCRState;
