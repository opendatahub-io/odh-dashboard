import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  List,
  ListItem,
} from '@patternfly/react-core';
import { AppContext } from '~/app/AppContext';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { getServingRuntimeSizes } from '~/pages/modelServing/screens/projects/utils';
import useServingAcceleratorProfile from '~/pages/modelServing/screens/projects/useServingAcceleratorProfile';
import { getResourceSize } from '~/pages/modelServing/utils';

type ServingRuntimeDetailsProps = {
  obj: ServingRuntimeKind;
  isvc?: InferenceServiceKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ obj, isvc }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const [acceleratorProfile] = useServingAcceleratorProfile(obj, isvc);
  const selectedAcceleratorProfile = acceleratorProfile.acceleratorProfile;
  const enabledAcceleratorProfiles = acceleratorProfile.acceleratorProfiles.filter(
    (ac) => ac.spec.enabled,
  );
  const resources = obj.spec.containers[0].resources || isvc?.spec.predictor.model.resources;
  const sizes = getServingRuntimeSizes(dashboardConfig);
  const size = sizes.find(
    (currentSize) => getResourceSize(sizes, resources || {}).name === currentSize.name,
  );

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server replicas</DescriptionListTerm>
        <DescriptionListDescription>
          {isvc?.spec.predictor.minReplicas || obj.spec.replicas || 'Unknown'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {resources && (
        <DescriptionListGroup>
          <DescriptionListTerm>Model server size</DescriptionListTerm>
          <DescriptionListDescription>
            <List isPlain>
              <ListItem>{size?.name || 'Custom'}</ListItem>
              <ListItem>
                {`${resources.requests?.cpu} CPUs, ${resources.requests?.memory} Memory requested`}
              </ListItem>
              <ListItem>
                {`${resources.limits?.cpu} CPUs, ${resources.limits?.memory} Memory limit`}
              </ListItem>
            </List>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
      <DescriptionListGroup>
        <DescriptionListTerm>Accelerator</DescriptionListTerm>
        <DescriptionListDescription>
          {selectedAcceleratorProfile
            ? `${selectedAcceleratorProfile.spec.displayName}${
                !selectedAcceleratorProfile.spec.enabled ? ' (disabled)' : ''
              }`
            : enabledAcceleratorProfiles.length === 0
            ? 'No accelerator enabled'
            : acceleratorProfile.useExisting
            ? 'Unknown'
            : 'No accelerator selected'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {!acceleratorProfile.useExisting && acceleratorProfile.acceleratorProfile && (
        <DescriptionListGroup>
          <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
          <DescriptionListDescription>{acceleratorProfile.count}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );
};

export default ServingRuntimeDetails;
