import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import ReplicaSection from '~/components/ReplicaSection';

type KServeAutoscalerReplicaSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  infoContent?: string;
};

const KServeAutoscalerReplicaSection: React.FC<KServeAutoscalerReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
}) => (
  <ReplicaSection
    infoContent={infoContent}
    isRequired
    onChange={(value) => {
      setData('minReplicas', value);
      setData('maxReplicas', value);
    }}
    value={data.minReplicas}
  />
);

export default KServeAutoscalerReplicaSection;
