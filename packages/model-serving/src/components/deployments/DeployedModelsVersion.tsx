import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { DeploymentResourceVersionLabels } from '../../shared/components';
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
  const labels = deployment.server ? (
    <DeploymentResourceVersionLabels resource={deployment.server} isCompact />
  ) : null;

  if (servingDetailsEntry) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <LazyCodeRefComponent
            component={servingDetailsEntry.extension.properties.ServingDetailsComponent}
            props={{ deployment, data: servingDetailsEntry.data }}
          />
        </FlexItem>
        {labels ? <FlexItem>{labels}</FlexItem> : null}
      </Flex>
    );
  }

  const displayName =
    deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-';

  if (labels) {
    return (
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>{displayName}</FlexItem>
        <FlexItem>{labels}</FlexItem>
      </Flex>
    );
  }

  return displayName;
};

export default DeployedModelsVersion;
