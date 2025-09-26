import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';
import ReplicaSection from '#~/components/ReplicaSection';

type KServeAutoscalerReplicaSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  infoContent?: string;
  onValidationChange?: (hasValidationErrors: boolean) => void;
};

const KServeAutoscalerReplicaSection: React.FC<KServeAutoscalerReplicaSectionProps> = ({
  data,
  setData,
  infoContent,
  onValidationChange,
}) => (
  <ReplicaSection
    infoContent={infoContent}
    isRequired
    onChange={(value) => {
      setData('minReplicas', value);
    }}
    value={data.minReplicas}
    maxValue={data.maxReplicas}
    onMaxChange={(value) => {
      setData('maxReplicas', value);
    }}
    onValidationChange={onValidationChange}
  />
);

export default KServeAutoscalerReplicaSection;
