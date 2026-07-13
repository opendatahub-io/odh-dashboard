import * as React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import ServingRuntimeVersionLabel from './ServingRuntimeVersionLabel';
import {
  isUnsupportedResource,
  getServingRuntimeVersion,
  getFastVersion,
} from '../../concepts/versions';

type DeploymentResourceVersionLabelsProps<T extends K8sResourceCommon> = {
  resource: T;
  isCompact?: boolean;
  isEditing?: boolean;
};

const DeploymentResourceVersionLabels = <T extends K8sResourceCommon>({
  resource,
  isCompact,
  isEditing,
}: DeploymentResourceVersionLabelsProps<T>): React.ReactElement | null => {
  const version = getServingRuntimeVersion(resource);
  const fastVersion = getFastVersion(resource);
  const unsupported = isUnsupportedResource(resource);

  if (!version && !fastVersion && !unsupported) {
    return null;
  }

  return (
    <LabelGroup>
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
        <ServingRuntimeVersionLabel version={version} isCompact={isCompact} isEditing={isEditing} />
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
    </LabelGroup>
  );
};

export default DeploymentResourceVersionLabels;
