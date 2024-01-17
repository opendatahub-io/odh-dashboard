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
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  getInferenceServiceFromServingRuntime,
  getServingRuntimeSizes,
} from '~/pages/modelServing/screens/projects/utils';
import useServingAcceleratorProfile from '~/pages/modelServing/screens/projects/useServingAcceleratorProfile';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import InferenceServiceCards from '~/pages/modelServing/screens/global/InferenceServiceCards';

type ServingRuntimeDetailsProps = {
  obj: ServingRuntimeKind;
  isvc?: InferenceServiceKind;
};

const ServingRuntimeDetails: React.FC<ServingRuntimeDetailsProps> = ({ obj, isvc }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const [acceleratorProfile] = useServingAcceleratorProfile(obj, isvc);
  const container = obj.spec.containers[0]; // can we assume the first container?
  const sizes = getServingRuntimeSizes(dashboardConfig);
  const size = sizes.find((size) => _.isEqual(size.resources, container.resources));

  const {
    inferenceServices: { data: inferenceServices },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

  return (
    <>
      <DescriptionList columnModifier={{ default: '3Col' }} isInlineGrid>
        <DescriptionListGroup>
          <DescriptionListTerm>Model server replicas</DescriptionListTerm>
          <DescriptionListDescription>{obj.spec.replicas}</DescriptionListDescription>
        </DescriptionListGroup>
        {container.resources && (
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
        )}
        {!acceleratorProfile.useExisting && (
          <DescriptionListGroup>
            <DescriptionListTerm>Number of GPUs</DescriptionListTerm>
            <DescriptionListDescription>[GPU count]</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
      {modelInferenceServices.length && (
        <InferenceServiceCards
          inferenceServices={modelInferenceServices}
          servingRuntimes={[obj]}
          refresh={() => {
            refreshAllProjectData();
          }}
        />
      )}
    </>
  );
};

export default ServingRuntimeDetails;
