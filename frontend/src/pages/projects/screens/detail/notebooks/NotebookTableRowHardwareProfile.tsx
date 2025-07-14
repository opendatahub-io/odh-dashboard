import { HelperText, HelperTextItem, Spinner } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { HardwareProfileKind } from '#~/k8sTypes';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils.ts';

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
      {hardwareProfile ? getHardwareProfileDisplayName(hardwareProfile) : <i>Custom</i>}{' '}
      {isProjectScoped && hardwareProfile?.metadata.namespace === namespace && (
        <ScopedLabel isProject color="blue" isCompact>
          {ScopedType.Project}
        </ScopedLabel>
      )}
    </>
  );
};

export default NotebookTableRowHardwareProfile;
