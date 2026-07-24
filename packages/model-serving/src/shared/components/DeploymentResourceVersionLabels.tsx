import * as React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  isUnsupportedResource,
  getServingRuntimeVersion,
  getFastVersion,
} from '../../concepts/versions';

type DeploymentResourceVersionLabelsProps<T extends K8sResourceCommon> = {
  resource: T;
  isCompact?: boolean;
  isEditing?: boolean;
  getVersion?: (resource: T) => string | undefined;
  // PF LabelGroup only spaces its children correctly when they are direct children,
  // not wrapped in fragments. These slots let callers render additional labels inside
  // this component's LabelGroup instead of nesting a second LabelGroup around it.
  versionStatus?: React.ReactNode;
  templateStatus?: React.ReactNode;
  scopeLabel?: React.ReactNode;
};

const DeploymentResourceVersionLabels = <T extends K8sResourceCommon>({
  resource,
  isCompact,
  isEditing,
  getVersion = getServingRuntimeVersion,
  versionStatus,
  templateStatus,
  scopeLabel,
}: DeploymentResourceVersionLabelsProps<T>): React.ReactElement | null => {
  const version = getVersion(resource);
  const fastVersion = getFastVersion(resource);
  const unsupported = isUnsupportedResource(resource);

  if (
    !version &&
    !fastVersion &&
    !unsupported &&
    !versionStatus &&
    !templateStatus &&
    !scopeLabel
  ) {
    return null;
  }

  return (
    // PF LabelGroup defaults numLabels to 3, which collapses labels behind a toggle.
    <LabelGroup numLabels={10}>
      {unsupported ? (
        <Label
          color={isEditing ? 'grey' : 'orange'}
          isCompact={isCompact}
          data-testid="limited-support-label"
        >
          Limited support
        </Label>
      ) : null}
      {version ? (
        <Label
          data-testid="serving-runtime-version-label"
          color={isEditing ? 'grey' : 'blue'}
          isCompact={isCompact}
        >
          {version}
        </Label>
      ) : null}
      {fastVersion ? (
        <Label
          color={isEditing ? 'grey' : 'yellow'}
          isCompact={isCompact}
          data-testid="fast-version-label"
        >
          fast-{fastVersion}
        </Label>
      ) : null}
      {versionStatus}
      {templateStatus}
      {scopeLabel}
    </LabelGroup>
  );
};

export default DeploymentResourceVersionLabels;
