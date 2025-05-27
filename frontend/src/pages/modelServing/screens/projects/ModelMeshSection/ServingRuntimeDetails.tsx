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
import { getServingRuntimeSizes } from '#~/pages/modelServing/screens/projects/utils';
import { getResourceSize } from '#~/pages/modelServing/utils';
import { formatMemory } from '#~/utilities/valueUnits';
import { useModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import ScopedLabel from '#~/components/ScopedLabel.tsx';

type ServingRuntimeDetailsProps = {
  project?: string;
  obj: ServingRuntimeKind;
  isvc?: InferenceServiceKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ project, obj, isvc }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const {
    acceleratorProfile: { initialState: initialAcceleratorProfileState },
    hardwareProfile,
  } = useModelServingPodSpecOptionsState(obj, isvc);
  const enabledAcceleratorProfiles = initialAcceleratorProfileState.acceleratorProfiles.filter(
    (ac) => ac.spec.enabled,
  );
  const resources = isvc?.spec.predictor.model?.resources || obj.spec.containers[0].resources;
  const sizes = getServingRuntimeSizes(dashboardConfig);
  const size = sizes.find(
    (currentSize) => getResourceSize(sizes, resources || {}).name === currentSize.name,
  );

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server replicas</DescriptionListTerm>
        <DescriptionListDescription>
          {isvc?.spec.predictor.minReplicas ?? obj.spec.replicas ?? 'Unknown'}
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
      {isHardwareProfileAvailable ? (
        <DescriptionListGroup>
          <DescriptionListTerm>Hardware profile</DescriptionListTerm>
          <DescriptionListDescription data-testid="hardware-section">
            {hardwareProfile.initialHardwareProfile ? (
              <Flex gap={{ default: 'gapSm' }}>
                <FlexItem>{hardwareProfile.initialHardwareProfile.spec.displayName}</FlexItem>
                <FlexItem>
                  {isProjectScopedAvailable &&
                    hardwareProfile.initialHardwareProfile.metadata.namespace === project && (
                      <ScopedLabel isProject color="blue" isCompact>
                        Project-scoped
                      </ScopedLabel>
                    )}
                </FlexItem>
                <Flex>
                  {!hardwareProfile.initialHardwareProfile.spec.enabled ? '(disabled)' : ''}
                </Flex>
              </Flex>
            ) : hardwareProfile.formData.useExistingSettings ? (
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
              {initialAcceleratorProfileState.acceleratorProfile ? (
                <>
                  {initialAcceleratorProfileState.acceleratorProfile.spec.displayName}
                  {isProjectScopedAvailable &&
                    initialAcceleratorProfileState.acceleratorProfile.metadata.namespace ===
                      project && (
                      <>
                        {' '}
                        <ScopedLabel isProject color="blue" isCompact>
                          Project-scoped
                        </ScopedLabel>
                      </>
                    )}
                  {!initialAcceleratorProfileState.acceleratorProfile.spec.enabled && ' (disabled)'}
                </>
              ) : enabledAcceleratorProfiles.length === 0 ? (
                'No accelerator enabled'
              ) : initialAcceleratorProfileState.unknownProfileDetected ? (
                'Unknown'
              ) : (
                'No accelerator selected'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {!initialAcceleratorProfileState.unknownProfileDetected &&
            initialAcceleratorProfileState.acceleratorProfile && (
              <DescriptionListGroup>
                <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
                <DescriptionListDescription>
                  {initialAcceleratorProfileState.count}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
        </>
      )}
    </DescriptionList>
  );
};

export default ServingRuntimeDetails;
