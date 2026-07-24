import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { DeploymentResourceVersionLabels } from '../../shared/components';
import {
  isUnsupportedResource,
  getServingRuntimeVersion,
  getFastVersion,
} from '../../concepts/versions';
import type { ExtensionDataEntry } from '../../concepts/extensionHelpers/usePlatformExtensionDataMap';
import { Deployment, type DeployedModelServingDetails } from '../../../extension-points';

type DeployedModelsVersionProps = {
  deployment: Deployment;
  servingDetailsEntry?: ExtensionDataEntry<DeployedModelServingDetails>;
};

const DeployedModelsVersion: React.FC<DeployedModelsVersionProps> = ({
  deployment,
  servingDetailsEntry,
}) => {
  const { server } = deployment;
  const hasLabels =
    !!server &&
    (isUnsupportedResource(server) ||
      !!getServingRuntimeVersion(server) ||
      !!getFastVersion(server));

  if (servingDetailsEntry) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <LazyCodeRefComponent
            component={servingDetailsEntry.extension.properties.ServingDetailsComponent}
            props={{ deployment, data: servingDetailsEntry.data }}
          />
        </FlexItem>
        {hasLabels ? (
          <FlexItem>
            <DeploymentResourceVersionLabels resource={server} isCompact />
          </FlexItem>
        ) : null}
      </Flex>
    );
  }

  const displayName = server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-';

  if (hasLabels) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>{displayName}</FlexItem>
        <FlexItem>
          <DeploymentResourceVersionLabels resource={server} isCompact />
        </FlexItem>
      </Flex>
    );
  }

  return displayName;
};

export default DeployedModelsVersion;
