import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Skeleton,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import useManageTrustyAICR from '#~/concepts/trustyai/useManageTrustyAICR';
import { TrustyInstallState } from '#~/concepts/trustyai/types';
import TrustyAIInstalledState from '#~/concepts/trustyai/content/statusStates/TrustyAIInstalledState';
import TrustyAIUninstalledState from '#~/concepts/trustyai/content/statusStates/TrustyAIUninstalledState';
import { ProjectKind } from '#~/k8sTypes';

type UseTrustyCRState = {
  action: React.ReactNode;
  status?: React.ReactNode;
};

const useTrustyCRState = (project: ProjectKind): UseTrustyCRState => {
  const namespace = project.metadata.name;
  const { statusState, installCRForExistingDB, installCRForNewDB, deleteCR } =
    useManageTrustyAICR(namespace);

  let action: React.ReactNode;
  let status: React.ReactNode;
  switch (statusState.type) {
    case TrustyInstallState.INFRA_ERROR:
    case TrustyInstallState.CR_ERROR:
      action = <TrustyAIInstalledState onDelete={deleteCR} />;
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
      action = <TrustyAIInstalledState onDelete={deleteCR} />;
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
      action = <TrustyAIInstalledState onDelete={deleteCR} />;
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
      action = <TrustyAIInstalledState uninstalling onDelete={deleteCR} />;
      break;
    case TrustyInstallState.UNINSTALLED:
    default:
      action = (
        <TrustyAIUninstalledState
          namespace={namespace}
          onInstallNewDB={installCRForNewDB}
          onInstallExistingDB={installCRForExistingDB}
        />
      );
  }

  return { action, status };
};

export default useTrustyCRState;
