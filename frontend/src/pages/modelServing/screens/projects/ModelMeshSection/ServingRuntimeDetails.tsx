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
import { useModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';
import {
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
} from '#~/pages/hardwareProfiles/utils.ts';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils.ts';
import { ServingRuntimePlatform } from '#~/types.ts';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses.ts';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext.tsx';

type ServingRuntimeDetailsProps = {
  project?: string;
  obj: ServingRuntimeKind;
  isvc?: InferenceServiceKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ project, obj, isvc }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const { platform: currentProjectServingPlatform } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );
  const isModelMesh = currentProjectServingPlatform === ServingRuntimePlatform.MULTI;

  const {
    acceleratorProfile: { initialState: initialAcceleratorProfileState },
    hardwareProfile,
  } = useModelServingPodSpecOptionsState(obj, isvc, isModelMesh);
  const enabledAcceleratorProfiles = initialAcceleratorProfileState.acceleratorProfiles.filter(
    (ac) => ac.spec.enabled,
  );
  const resources = isvc?.spec.predictor.model?.resources || obj.spec.containers[0].resources;
  const sizes = getModelServingSizes(dashboardConfig);
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
      {isHardwareProfileAvailable && !isModelMesh && (
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
      )}
      {!isHardwareProfileAvailable && (
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
                          {ScopedType.Project}
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
