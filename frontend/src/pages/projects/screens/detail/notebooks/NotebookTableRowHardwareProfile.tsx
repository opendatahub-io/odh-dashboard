import { HelperText, HelperTextItem, Label, Spinner } from '@patternfly/react-core';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { HardwareProfileKind } from '#~/k8sTypes';

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
        <Label
          variant="outline"
          color="blue"
          data-testid="project-scoped-label"
          isCompact
          icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
        >
          Project-scoped
        </Label>
      )}
    </>
  );
};

export default NotebookTableRowHardwareProfile;
