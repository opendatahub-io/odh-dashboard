import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  isUnsupportedResource,
  getServingRuntimeVersion,
  getFastVersion,
} from '../../concepts/versions';

export type RenderDeploymentResourceVersionLabelsOptions = {
  isCompact?: boolean;
  isEditing?: boolean;
  getVersion?: (resource: K8sResourceCommon) => string | undefined;
};

// This is a render function (not a component) so that its Labels can be spread as direct
// children of a caller's LabelGroup. PF LabelGroup only applies correct spacing to direct
// children — Labels nested inside a fragment or wrapper component lose their spacing.
// If PF fixes that LabelGroup behavior, this could become a component rendering a fragment.
export const renderDeploymentResourceVersionLabels = (
  resource: K8sResourceCommon,
  options?: RenderDeploymentResourceVersionLabelsOptions,
): React.ReactElement[] => {
  const { isCompact, isEditing, getVersion = getServingRuntimeVersion } = options ?? {};
  const version = getVersion(resource);
  const fastVersion = getFastVersion(resource);
  const unsupported = isUnsupportedResource(resource);

  const labels: React.ReactElement[] = [];

  if (unsupported) {
    labels.push(
      <Label
        key="limited-support"
        color={isEditing ? 'grey' : 'orange'}
        isCompact={isCompact}
        data-testid="limited-support-label"
      >
        Limited support
      </Label>,
    );
  }

  if (version) {
    labels.push(
      <Label
        key="serving-runtime-version"
        data-testid="serving-runtime-version-label"
        color={isEditing ? 'grey' : 'blue'}
        isCompact={isCompact}
      >
        {version}
      </Label>,
    );
  }

  if (fastVersion) {
    labels.push(
      <Label
        key="fast-version"
        color={isEditing ? 'grey' : 'yellow'}
        isCompact={isCompact}
        data-testid="fast-version-label"
      >
        fast-{fastVersion}
      </Label>,
    );
  }

  return labels;
};
