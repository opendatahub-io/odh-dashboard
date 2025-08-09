import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';
import ReplicaSection from '#~/components/ReplicaSection';

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
      if (data.isKServeRawDeployment) {
        setData('maxReplicas', value);
      } else if (value > data.maxReplicas) {
        setData('maxReplicas', value);
      }
    }}
    value={data.minReplicas}
    showMinMax={!!data.isKServeRawDeployment}
    maxValue={data.maxReplicas}
    onMaxChange={(value) => {
      setData('maxReplicas', value);
    }}
  />
);

export default KServeAutoscalerReplicaSection;
