import * as React from 'react';
import { FormSection } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingServingRuntimeObject } from '#~/pages/modelServing/screens/types';
import ReplicaSection from '#~/components/ReplicaSection';

type ServingRuntimeReplicaSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  infoContent?: string;
};

/** @deprecated -- no more MM */
const ServingRuntimeReplicaSection: React.FC<ServingRuntimeReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => (
  <FormSection title="Model server replicas">
    <ReplicaSection
      infoContent={infoContent}
      onChange={(value) => setData('numReplicas', value)}
      value={data.numReplicas}
      maxValue={data.numReplicas}
    />
  </FormSection>
);

export default ServingRuntimeReplicaSection;
