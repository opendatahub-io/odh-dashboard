import { HelperText, HelperTextItem, Spinner } from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileKind } from '~/k8sTypes';

type NotebookTableRowHardwareProfileProps = {
  loaded: boolean;
  loadError?: Error;
  hardwareProfile?: HardwareProfileKind;
};

const NotebookTableRowHardwareProfile: React.FC<NotebookTableRowHardwareProfileProps> = ({
  loaded,
  loadError,
  hardwareProfile,
}) => {
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

  return <>{hardwareProfile?.spec.displayName ?? <i>Custom</i>}</>;
};

export default NotebookTableRowHardwareProfile;
