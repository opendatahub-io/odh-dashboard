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
  Truncate,
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
import { ModelAvailabilityFieldsData } from '../../../components/deploymentWizard/types';

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

const ModelSizeItem = ({ resources }: { resources?: ContainerResources }) => {
  const { dashboardConfig } = useAppContext();
  const sizes = useDeepCompareMemoize(getModelServingSizes(dashboardConfig));
  const existingSizeName = useDeepCompareMemoize(
    resources ? getResourceSize(sizes, resources).name : undefined,
  );

  const { requests, limits } = resources || {};

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server size</DescriptionListTerm>
        <DescriptionListDescription>
          <List isPlain>
            <ListItem>{existingSizeName || 'Custom'}</ListItem>
            <ListItem>
              {requests?.cpu ?? 'Unknown'} CPUs, {formatMemory(requests?.memory ?? 'Unknown')}{' '}
              Memory requested
            </ListItem>
            <ListItem>
              {limits?.cpu ?? 'Unknown'} CPUs, {formatMemory(limits?.memory ?? 'Unknown')} Memory
              limit
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

const ModelAvailabilityItem = ({
  modelAvailability,
}: {
  modelAvailability: ModelAvailabilityFieldsData;
}) => {
  const availabilityTypes = [];
  if (modelAvailability.saveAsAiAsset) {
    availabilityTypes.push('AI asset endpoint');
  }
  if (modelAvailability.saveAsMaaS) {
    availabilityTypes.push('Model-as-a-Service (MaaS)');
  }
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model availability</DescriptionListTerm>
        <DescriptionListDescription>
          {availabilityTypes.length > 0 ? availabilityTypes.join(', ') : 'No model availability'}
        </DescriptionListDescription>
        {availabilityTypes.length > 0 ? (
          <>
            <DescriptionListTerm>Use case</DescriptionListTerm>
            <DescriptionListDescription>
              <Truncate content={modelAvailability.useCase ?? 'No use case'} />
            </DescriptionListDescription>
          </>
        ) : null}
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const DescriptionItem = ({ description }: { description: string }) => {
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Description</DescriptionListTerm>
        <DescriptionListDescription>
          <Truncate content={description} />
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
    () =>
      typeof formDataExtension?.properties.extractModelFormat === 'function'
        ? formDataExtension.properties.extractModelFormat(deployment)
        : null,
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
  const description = React.useMemo(
    () => deployment.model.metadata.annotations?.['openshift.io/description'],
    [deployment],
  );

  const modelAvailability = React.useMemo(
    () => formDataExtension?.properties.extractModelAvailabilityData(deployment),
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
            {description && <DescriptionItem description={description} />}
            {modelFormat && <FrameworkItem framework={modelFormat} />}
            <ReplicasItem replicas={replicas} />
            <ModelSizeItem resources={hardwareProfileConfig?.[1]} />
            {hardwareProfileConfig && (
              <HardwareProfileNameValue
                project={deployment.model.metadata.namespace}
                hardwareProfileConfig={hardwareProfileConfig}
              />
            )}
            {modelAvailability && <ModelAvailabilityItem modelAvailability={modelAvailability} />}
            <TokenAuthenticationItem deployment={deployment} />
          </Stack>
        </ExpandableRowContent>
      </Td>
    </ResourceTr>
  );
};
