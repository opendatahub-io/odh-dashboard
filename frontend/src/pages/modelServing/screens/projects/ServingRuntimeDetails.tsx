import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  List,
  ListItem,
} from '@patternfly/react-core';
import { AppContext } from '#~/app/AppContext';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getModelServingSizes } from '#~/concepts/modelServing/modelServingSizesUtils';
import { getResourceSize } from '#~/pages/modelServing/utils';
import { formatMemory } from '#~/utilities/valueUnits';
import { useModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/deprecated/useModelServingAcceleratorDeprecatedPodSpecOptionsState';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import {
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
} from '#~/pages/hardwareProfiles/utils.ts';
import { isNIMOperatorManaged } from '#~/pages/modelServing/screens/global/nimOperatorUtils';

type ServingRuntimeDetailsProps = {
  project?: string;
  obj?: ServingRuntimeKind;
  isvc?: InferenceServiceKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ project, obj, isvc }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  // Check if this is a NIM Operator-managed deployment
  const isNIMManaged = isvc && isNIMOperatorManaged(isvc);

  // todo: deal with the accelProfile below...
  const { hardwareProfile } = useModelServingPodSpecOptionsState(obj, isvc);

  // Get resources - for NIM Operator, extract from containers
  let resources;
  if (isNIMManaged) {
    // NIM Operator uses containers instead of model spec
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    const predictor = isvc.spec.predictor as any;
    resources = predictor?.containers?.[0]?.resources;
  } else {
    // Regular path: try InferenceService model resources, fallback to ServingRuntime
    resources = isvc?.spec.predictor.model?.resources || obj?.spec.containers[0].resources;
  }

  const sizes = getModelServingSizes(dashboardConfig);
  const size = sizes.find(
    (currentSize) => getResourceSize(sizes, resources || {}).name === currentSize.name,
  );

  // todo: check out the 'flex' with just the quotes below....
  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server replicas</DescriptionListTerm>
        <DescriptionListDescription>
          {isvc?.spec.predictor.minReplicas ?? obj?.spec.replicas ?? 'Unknown'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {resources && (
        <DescriptionListGroup>
          <DescriptionListTerm>Model server size</DescriptionListTerm>
          <DescriptionListDescription>
            <List isPlain>
              <ListItem>{size?.name || 'Custom'}</ListItem>
              <ListItem>
                {`${resources.requests?.cpu ?? ''} CPUs, ${formatMemory(
                  resources.requests?.memory ?? '',
                )} Memory requested`}
              </ListItem>
              <ListItem>
                {`${resources.limits?.cpu ?? ''} CPUs, ${formatMemory(
                  resources.limits?.memory ?? '',
                )} Memory limit`}
              </ListItem>
            </List>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
      <DescriptionListGroup>
        <DescriptionListTerm>Hardware profile</DescriptionListTerm>
        <DescriptionListDescription data-testid="hardware-section">
          {hardwareProfile.initialHardwareProfile ? (
            <Flex gap={{ default: 'gapSm' }}>
              <FlexItem>
                {getHardwareProfileDisplayName(hardwareProfile.initialHardwareProfile)}
              </FlexItem>
              <FlexItem>
                {isProjectScopedAvailable &&
                  hardwareProfile.initialHardwareProfile.metadata.namespace === project && (
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
          ) : hardwareProfile.formData.useExistingSettings ? (
            'Unknown'
          ) : (
            'No hardware profile selected'
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default ServingRuntimeDetails;
