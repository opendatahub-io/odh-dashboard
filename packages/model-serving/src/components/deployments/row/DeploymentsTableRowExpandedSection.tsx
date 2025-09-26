import React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import {
  DescriptionListDescription,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionList,
  Stack,
  ListItem,
  List,
} from '@patternfly/react-core';
import { formatMemory } from '@odh-dashboard/internal/utilities/valueUnits';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { ContainerResources } from '@odh-dashboard/internal/types';
import { useAppContext } from '@odh-dashboard/internal/app/AppContext';
import { useDeepCompareMemoize } from '@odh-dashboard/internal/utilities/useDeepCompareMemoize';
import { getModelServingSizes } from '@odh-dashboard/internal/concepts/modelServing/modelServingSizesUtils';
import { getResourceSize } from '@odh-dashboard/internal/pages/modelServing/utils';
import { TokensDescriptionItem } from '@odh-dashboard/internal/concepts/modelServing/ModelRow/TokensDescriptionItem';
import HardwareProfileNameValue from './HardwareProfileNameValue';
import { isDeploymentAuthEnabled, useDeploymentAuthTokens } from '../../../concepts/auth';
import { useResolvedDeploymentExtension } from '../../../../src/concepts/extensionUtils';
import {
  isModelServingDeploymentFormDataExtension,
  type Deployment,
} from '../../../../extension-points';

const FrameworkItem = ({ framework }: { framework: SupportedModelFormats }) => {
  const name = `${framework.name}${framework.version ? `-${framework.version}` : ''}`;
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Framework</DescriptionListTerm>
        <DescriptionListDescription>{name || 'Unknown'}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const ReplicasItem = ({ replicas }: { replicas?: number | null }) => {
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server replicas</DescriptionListTerm>
        <DescriptionListDescription>{replicas ?? 'Unknown'}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const ModelSizeItem = ({ resources }: { resources: ContainerResources }) => {
  const { dashboardConfig } = useAppContext();
  const sizes = useDeepCompareMemoize(getModelServingSizes(dashboardConfig));
  const existingSizeName = useDeepCompareMemoize(getResourceSize(sizes, resources).name);

  const { requests, limits } = resources;
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server size</DescriptionListTerm>
        <DescriptionListDescription>
          <List isPlain>
            <ListItem>{existingSizeName || 'Custom'}</ListItem>
            <ListItem>
              {`${requests?.cpu ?? ''} CPUs, ${formatMemory(
                requests?.memory ?? '',
              )} Memory requested`}
            </ListItem>
            <ListItem>
              {`${limits?.cpu ?? ''} CPUs, ${formatMemory(limits?.memory ?? '')} Memory limit`}
            </ListItem>
          </List>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const TokenAuthenticationItem = ({ deployment }: { deployment: Deployment }) => {
  const isAuthenticated = isDeploymentAuthEnabled(deployment);
  const { data: deploymentSecrets, loaded, error } = useDeploymentAuthTokens(deployment);

  return (
    <DescriptionList
      {...(!isAuthenticated && {
        isHorizontal: true,
        horizontalTermWidthModifier: { default: '250px' },
      })}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>Token authentication</DescriptionListTerm>
        <DescriptionListDescription>
          <TokensDescriptionItem
            tokens={deploymentSecrets}
            isTokenEnabled={isAuthenticated}
            loaded={loaded}
            error={error}
          />
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export const DeploymentRowExpandedSection: React.FC<{
  deployment: Deployment;
  isVisible: boolean;
}> = ({ deployment, isVisible }) => {
  const [formDataExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentFormDataExtension,
    deployment,
  );
  const modelFormat = React.useMemo(
    () => formDataExtension?.properties.extractModelFormat(deployment),
    [formDataExtension, deployment],
  );
  const replicas = React.useMemo(
    () => formDataExtension?.properties.extractReplicas(deployment),
    [formDataExtension, deployment],
  );
  const hardwareProfileConfig = React.useMemo(
    () => formDataExtension?.properties.extractHardwareProfileConfig(deployment),
    [formDataExtension, deployment],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <ResourceTr isExpanded resource={deployment.model}>
      <Td />
      <Td dataLabel="Information" colSpan={5}>
        <ExpandableRowContent>
          <Stack hasGutter>
            {modelFormat && <FrameworkItem framework={modelFormat} />}
            <ReplicasItem replicas={replicas} />
            {hardwareProfileConfig?.[1] && <ModelSizeItem resources={hardwareProfileConfig[1]} />}
            {hardwareProfileConfig && (
              <HardwareProfileNameValue hardwareProfileConfig={hardwareProfileConfig} />
            )}
            <TokenAuthenticationItem deployment={deployment} />
          </Stack>
        </ExpandableRowContent>
      </Td>
    </ResourceTr>
  );
};
