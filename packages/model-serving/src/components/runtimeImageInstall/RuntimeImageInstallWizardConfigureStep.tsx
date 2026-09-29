import React from 'react';
import { Alert, Button, Spinner, useWizardContext } from '@patternfly/react-core';
import type {
  RuntimeImageInstallTargetExtension,
  RuntimeImageInstallTargetProps,
} from '../../../extension-points/runtime-image-install-target';

type RuntimeImageInstallWizardConfigureStepProps = {
  selectedTarget: RuntimeImageInstallTargetExtension | undefined;
  targetData: RuntimeImageInstallTargetProps['targetData'] | undefined;
  cancelReturnRoute: string;
};

const RuntimeImageInstallWizardConfigureStep: React.FC<
  RuntimeImageInstallWizardConfigureStepProps
> = ({ selectedTarget, targetData, cancelReturnRoute }) => {
  const { goToPrevStep } = useWizardContext();
  const [componentState, setComponentState] = React.useState<
    | { status: 'loading' }
    | { status: 'error' }
    | {
        status: 'ready';
        Component: React.ComponentType<RuntimeImageInstallTargetProps>;
        source: RuntimeImageInstallTargetExtension['properties']['component'];
      }
  >({ status: 'loading' });

  React.useEffect(() => {
    if (!selectedTarget || !targetData) {
      return;
    }
    let active = true;
    setComponentState({ status: 'loading' });
    selectedTarget.properties.component().then(
      ({ default: Component }) => {
        if (active) {
          setComponentState({
            status: 'ready',
            Component,
            source: selectedTarget.properties.component,
          });
        }
      },
      () => {
        if (active) {
          setComponentState({ status: 'error' });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [selectedTarget, targetData]);

  if (!selectedTarget || !targetData) {
    return (
      <Alert variant="warning" title="Install target no longer available">
        Return to Install target and choose an available option.
        <Button variant="link" onClick={goToPrevStep}>
          Back to Install target
        </Button>
      </Alert>
    );
  }
  if (componentState.status === 'error') {
    return (
      <Alert variant="danger" title="Unable to load install configuration">
        Return to Install target and try again.
        <Button variant="link" onClick={goToPrevStep}>
          Back to Install target
        </Button>
      </Alert>
    );
  }
  if (
    componentState.status === 'loading' ||
    componentState.source !== selectedTarget.properties.component
  ) {
    return <Spinner aria-label="Loading install configuration" />;
  }
  const { Component } = componentState;
  return (
    <Component
      targetData={targetData}
      onBack={goToPrevStep}
      cancelReturnRoute={cancelReturnRoute}
    />
  );
};

export default RuntimeImageInstallWizardConfigureStep;
