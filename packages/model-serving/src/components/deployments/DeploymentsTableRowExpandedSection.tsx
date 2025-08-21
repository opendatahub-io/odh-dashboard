import React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  StackItem,
  DescriptionListDescription,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionList,
  Stack,
  ListItem,
  List,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { formatMemory } from '@odh-dashboard/internal/utilities/valueUnits';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';
import ScopedLabel from '@odh-dashboard/internal/components/ScopedLabel';
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import { TokensDescriptionItem } from '@odh-dashboard/internal/concepts/modelServing/ModelRow/TokensDescriptionItem';
import {
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
} from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import {
  type Deployment,
  type ModelServingAuthExtension,
  type ModelServingDeploymentResourcesExtension,
  type ModelServingDeploymentsExpandedInfo,
} from '../../../extension-points';
import { useDeploymentAuthEnabled, useDeploymentAuthTokens } from '../../concepts/auth';

// Currently a fairly opinionated component that integrates easily with KServe
// May need to be updated as we add more platforms
export const DeploymentRowExpandedSection: React.FC<{
  deployment: Deployment;
  useFramework: ResolvedExtension<ModelServingDeploymentsExpandedInfo>['properties']['useFramework'];
  useReplicas: ResolvedExtension<ModelServingDeploymentsExpandedInfo>['properties']['useReplicas'];
  useResources: ResolvedExtension<ModelServingDeploymentResourcesExtension>['properties']['useResources'];
  usePlatformAuth: ResolvedExtension<ModelServingAuthExtension>['properties']['usePlatformAuthEnabled'];
}> = ({ deployment, useFramework, useReplicas, useResources, usePlatformAuth }) => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const project = deployment.model.metadata.namespace;

  const framework = useFramework(deployment);
  const replicas = useReplicas(deployment);

  const resources = useResources(deployment);
  const modelSize = resources?.modelSize.selectedSize;
  const hardwareProfile = resources?.hardwareProfile;
  const acceleratorProfile = resources?.acceleratorProfile.initialState.acceleratorProfile;
  const isUnknownProfileDetected =
    resources?.acceleratorProfile.initialState.unknownProfileDetected;
  const acceleratorProfileCount = resources?.acceleratorProfile.initialState.count;
  const enabledAcceleratorProfiles =
    resources?.acceleratorProfile.initialState.acceleratorProfiles.filter((ac) => ac.spec.enabled);

  const isPlatformAuthEnabled = usePlatformAuth(deployment);

  const isDeploymentAuthEnabled = useDeploymentAuthEnabled(deployment);
  const { data: deploymentSecrets, loaded, error } = useDeploymentAuthTokens(deployment);

  return (
    <ResourceTr isExpanded resource={deployment.model}>
      <Td />
      <Td dataLabel="Information" colSpan={5}>
        <ExpandableRowContent>
          <Stack hasGutter>
            <StackItem>
              <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Framework</DescriptionListTerm>
                  <DescriptionListDescription>{framework || 'Unknown'}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </StackItem>
            <StackItem>
              <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Model server replicas</DescriptionListTerm>
                  <DescriptionListDescription>{replicas || 'Unknown'}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Model server size</DescriptionListTerm>
                  <DescriptionListDescription>
                    <List isPlain>
                      <ListItem>{modelSize?.name || 'Custom'}</ListItem>
                      <ListItem>
                        {`${modelSize?.resources.requests?.cpu ?? ''} CPUs, ${formatMemory(
                          modelSize?.resources.requests?.memory ?? '',
                        )} Memory requested`}
                      </ListItem>
                      <ListItem>
                        {`${modelSize?.resources.limits?.cpu ?? ''} CPUs, ${formatMemory(
                          modelSize?.resources.limits?.memory ?? '',
                        )} Memory limit`}
                      </ListItem>
                    </List>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {isHardwareProfileAvailable ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Hardware profile</DescriptionListTerm>
                    <DescriptionListDescription data-testid="hardware-section">
                      {hardwareProfile?.initialHardwareProfile ? (
                        <Flex gap={{ default: 'gapSm' }}>
                          <FlexItem>
                            {getHardwareProfileDisplayName(hardwareProfile.initialHardwareProfile)}
                          </FlexItem>
                          <FlexItem>
                            {isProjectScopedAvailable &&
                              hardwareProfile.initialHardwareProfile.metadata.namespace ===
                                project && (
                                <ScopedLabel isProject color="blue" isCompact>
                                  {ScopedType.Project}
                                </ScopedLabel>
                              )}
                          </FlexItem>
                          <Flex>
                            {!isHardwareProfileEnabled(hardwareProfile.initialHardwareProfile)
                              ? '(disabled)'
                              : ''}
                          </Flex>
                        </Flex>
                      ) : hardwareProfile?.formData.useExistingSettings ? (
                        'Unknown'
                      ) : (
                        'No hardware profile selected'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : (
                  <>
                    <DescriptionListGroup data-testid="accelerator-section">
                      <DescriptionListTerm>Accelerator</DescriptionListTerm>
                      <DescriptionListDescription>
                        {acceleratorProfile ? (
                          <>
                            {acceleratorProfile.spec.displayName}
                            {isProjectScopedAvailable &&
                              acceleratorProfile.metadata.namespace === project && (
                                <>
                                  {' '}
                                  <ScopedLabel isProject color="blue" isCompact>
                                    {ScopedType.Project}
                                  </ScopedLabel>
                                </>
                              )}
                            {!acceleratorProfile.spec.enabled && ' (disabled)'}
                          </>
                        ) : enabledAcceleratorProfiles?.length === 0 ? (
                          'No accelerator enabled'
                        ) : isUnknownProfileDetected ? (
                          'Unknown'
                        ) : (
                          'No accelerator selected'
                        )}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    {!isUnknownProfileDetected && acceleratorProfile && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
                        <DescriptionListDescription>
                          {acceleratorProfileCount}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </>
                )}
              </DescriptionList>
            </StackItem>
            {isPlatformAuthEnabled && (
              <StackItem>
                <DescriptionList
                  {...(!isDeploymentAuthEnabled && {
                    isHorizontal: true,
                    horizontalTermWidthModifier: { default: '250px' },
                  })}
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Token authentication</DescriptionListTerm>
                    <DescriptionListDescription>
                      <TokensDescriptionItem
                        tokens={deploymentSecrets}
                        isTokenEnabled={isDeploymentAuthEnabled}
                        loaded={loaded}
                        error={error}
                      />
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
            )}
          </Stack>
        </ExpandableRowContent>
      </Td>
    </ResourceTr>
  );
};
