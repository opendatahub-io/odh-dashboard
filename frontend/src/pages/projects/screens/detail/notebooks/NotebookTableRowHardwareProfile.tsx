import { HelperText, HelperTextItem, Spinner } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { HardwareProfileKind } from '#~/k8sTypes';
import ScopedLabel from '#~/components/ScopedLabel';

type NotebookTableRowHardwareProfileProps = {
  namespace: string;
  loaded: boolean;
  loadError?: Error;
  hardwareProfile?: HardwareProfileKind;
};

const NotebookTableRowHardwareProfile: React.FC<NotebookTableRowHardwareProfileProps> = ({
  namespace,
  loaded,
  loadError,
  hardwareProfile,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="error">Custom</HelperTextItem>
      </HelperText>
    );
  }

  if (!loaded) {
    return <Spinner size="md" />;
  }

  return (
    <>
      {hardwareProfile?.spec.displayName ?? <i>Custom</i>}{' '}
      {isProjectScoped && hardwareProfile?.metadata.namespace === namespace && (
        <ScopedLabel isProject color="blue" isCompact>
          Project-scoped
        </ScopedLabel>
      )}
    </>
  );
};

export default NotebookTableRowHardwareProfile;
