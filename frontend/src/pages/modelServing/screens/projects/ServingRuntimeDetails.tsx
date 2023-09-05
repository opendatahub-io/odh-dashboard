import * as React from 'react';
import * as _ from 'lodash';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  List,
  ListItem,
} from '@patternfly/react-core';
import { AppContext } from '~/app/AppContext';
import { ServingRuntimeKind } from '~/k8sTypes';
import { getServingRuntimeSizes } from './utils';
import useServingAccelerator from './useServingAccelerator';

type ServingRuntimeDetailsProps = {
  obj: ServingRuntimeKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ obj }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const container = obj.spec.containers[0]; // can we assume the first container?
  const sizes = getServingRuntimeSizes(dashboardConfig);
  const size = sizes.find((size) => _.isEqual(size.resources, container.resources));
  const [accelerator] = useServingAccelerator(obj);

  return (
    <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server replicas</DescriptionListTerm>
        <DescriptionListDescription>{obj.spec.replicas}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Model server size</DescriptionListTerm>
        <DescriptionListDescription>
          <List isPlain>
            <ListItem>{size?.name || 'Custom'}</ListItem>
            <ListItem>
              {`${container.resources.requests?.cpu} CPUs, ${container.resources.requests?.memory} Memory requested`}
            </ListItem>
            <ListItem>
              {`${container.resources.limits?.cpu} CPUs, ${container.resources.limits?.memory} Memory limit`}
            </ListItem>
          </List>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Accelerator</DescriptionListTerm>
        <DescriptionListDescription>
          {accelerator.accelerator?.spec.displayName || 'unknown'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
        <DescriptionListDescription>{accelerator.count}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default ServingRuntimeDetails;
