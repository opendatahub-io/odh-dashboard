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
} from '@patternfly/react-core';
import { formatMemory } from '@odh-dashboard/internal/utilities/valueUnits';
import { AppContext } from '@odh-dashboard/internal/app/AppContext';
import { getResourceSize } from '@odh-dashboard/internal/pages/modelServing/utils';
import { getModelServingSizes } from '@odh-dashboard/internal/concepts/modelServing/modelServingSizesUtils';
import {
  type Deployment,
  type ModelServingDeploymentsExpandedInfo,
} from '../../../extension-points';

// Currently a fairly opinionated component that integrates easily with KServe
// May need to be updated as we add more platforms
export const DeploymentRowExpandedSection: React.FC<{
  deployment: Deployment;
  expandedInfo: ResolvedExtension<ModelServingDeploymentsExpandedInfo>;
}> = ({ deployment, expandedInfo }) => {
  const { dashboardConfig } = React.useContext(AppContext);

  const framework = expandedInfo.properties.getFramework(deployment);
  const replicas = expandedInfo.properties.getReplicas(deployment);
  const resources = expandedInfo.properties.getResourceSize(deployment);
  // TODO: Add hardware accelerator and tokens
  // const getHardwareAccelerator =
  //   expandedInfoExtension.properties.getHardwareAccelerator(deployment);
  // const getTokens = expandedInfo.properties.getTokens(deployment);

  const namedSizes = getModelServingSizes(dashboardConfig);
  const matchingNamedSize = namedSizes.find(
    (currentSize) => getResourceSize(namedSizes, resources || {}).name === currentSize.name,
  );

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
                  <DescriptionListTerm>Replicas</DescriptionListTerm>
                  <DescriptionListDescription>{replicas || 'Unknown'}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Model server size</DescriptionListTerm>
                  <DescriptionListDescription>
                    <List isPlain>
                      <ListItem>{matchingNamedSize?.name || 'Custom'}</ListItem>
                      <ListItem>
                        {`${resources?.requests?.cpu ?? ''} CPUs, ${formatMemory(
                          resources?.requests?.memory ?? '',
                        )} Memory requested`}
                      </ListItem>
                      <ListItem>
                        {`${resources?.limits?.cpu ?? ''} CPUs, ${formatMemory(
                          resources?.limits?.memory ?? '',
                        )} Memory limit`}
                      </ListItem>
                    </List>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </StackItem>
            {/* {servingRuntime && (
              <StackItem>
                <ServingRuntimeDetails project={project} obj={servingRuntime} isvc={obj} />
              </StackItem>
            )}
            {isAuthAvailable && (
              <StackItem>
                <DescriptionList
                  {...(!isInferenceServiceTokenEnabled(obj) && {
                    isHorizontal: true,
                    horizontalTermWidthModifier: { default: '250px' },
                  })}
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Token authentication</DescriptionListTerm>
                    <DescriptionListDescription>
                      <ServingRuntimeTokensTable
                        obj={obj}
                        isTokenEnabled={isInferenceServiceTokenEnabled(obj)}
                      />
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
            )} */}
          </Stack>
        </ExpandableRowContent>
      </Td>
    </ResourceTr>
  );
};
