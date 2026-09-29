import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import RuntimeImageInstallPageUnavailable from './RuntimeImageInstallPageUnavailable';
import RuntimeImageInstallWizardConfigureStep from './RuntimeImageInstallWizardConfigureStep';
import RuntimeImageInstallWizardTargetStep from './RuntimeImageInstallWizardTargetStep';
import { getAvailableInstallTargets, getMatchingInstallTarget } from './utils';
import { GENERAL_SETTINGS_PATH } from './const';
import type { PlaceholderRuntimeImageActionData } from './placeholder-types';
import {
  isRuntimeImageInstallTargetExtension,
  type RuntimeImageInstallTargetExtension,
  type RuntimeImageInstallTargetId,
} from '../../../extension-points/runtime-image-install-target';

const InstallWizardFooter: React.FC<{
  selected: RuntimeImageInstallTargetId | undefined;
  canInstall: boolean;
}> = ({ selected, canInstall }) => {
  const { activeStep, goToNextStep, close } = useWizardContext();
  // The selected platform owns all controls on Step 2, including its action bar.
  if (activeStep.index !== 1) {
    return null;
  }
  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="secondary" isDisabled>
              Back
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              data-testid="runtime-image-install-next"
              variant="primary"
              isDisabled={!selected || !canInstall}
              onClick={goToNextStep}
            >
              Next
            </Button>
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

const InstallWizard: React.FC<{
  data: PlaceholderRuntimeImageActionData;
  installTargetExtensions: RuntimeImageInstallTargetExtension[];
}> = ({ data, installTargetExtensions }) => {
  const navigate = useNavigate();
  const installTargets = getAvailableInstallTargets(data, installTargetExtensions);
  const { cancelReturnRoute } = data;
  const [selected, setSelected] = React.useState<RuntimeImageInstallTargetId>();
  const selectedTarget = selected ? getMatchingInstallTarget(installTargets, selected) : undefined;
  const targetData = selected ? data.deploymentResources[selected] : undefined;

  if (installTargets.length === 0) {
    return (
      <RuntimeImageInstallPageUnavailable
        title={`Install ${data.runtimeImageName}`}
        message="No runtime image install target extensions are available."
        returnRoute={cancelReturnRoute}
      />
    );
  }

  return (
    <ApplicationsPage
      title={`Install ${data.runtimeImageName}`}
      description="Choose how this runtime image should be installed, then review and edit the configuration before creating it on this cluster."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={GENERAL_SETTINGS_PATH}>Model deployment settings</Link>}
          />
          {/* TODO: Link to the Runtime image library when its final route is available in https://redhat.atlassian.net/browse/RHOAIENG-96641. */}
          <BreadcrumbItem>Runtime image library</BreadcrumbItem>
          <BreadcrumbItem
            render={() => <Link to={cancelReturnRoute}>{data.runtimeImageName}</Link>}
          />
          <BreadcrumbItem isActive>Install</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <Wizard
        onClose={() => navigate(cancelReturnRoute)}
        footer={
          <InstallWizardFooter selected={selected} canInstall={selectedTarget !== undefined} />
        }
      >
        <WizardStep name="Install target" id="install-target">
          <RuntimeImageInstallWizardTargetStep
            installTargets={installTargets}
            selected={selected}
            onSelect={setSelected}
          />
        </WizardStep>
        <WizardStep
          name={selectedTarget?.properties.configureStepLabel ?? 'Configure'}
          id="configure-install"
          isDisabled={!selectedTarget}
        >
          <RuntimeImageInstallWizardConfigureStep
            selectedTarget={selectedTarget}
            targetData={targetData}
            cancelReturnRoute={cancelReturnRoute}
          />
        </WizardStep>
      </Wizard>
    </ApplicationsPage>
  );
};

const RuntimeImageInstallPage: React.FC = () => {
  const location = useLocation();
  const installTargetExtensions = useExtensions(isRuntimeImageInstallTargetExtension);
  const actionData: PlaceholderRuntimeImageActionData | undefined = location.state?.actionData;

  if (!actionData) {
    return (
      <RuntimeImageInstallPageUnavailable
        title="Install runtime image"
        message="The installation data is missing. Return to the runtime image library and try again."
        returnRoute={GENERAL_SETTINGS_PATH}
      />
    );
  }

  return (
    <InstallWizard
      key={actionData.runtimeImageId}
      data={actionData}
      installTargetExtensions={installTargetExtensions}
    />
  );
};

export default RuntimeImageInstallPage;
