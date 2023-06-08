import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { BaseMetricRequest } from '~/api';

const useBiasConfigurationObject = (
  modelId: string,
  existingData?: BiasMetricConfig,
): [
  data: BaseMetricRequest,
  setData: UpdateObjectAtPropAndValue<BaseMetricRequest>,
  resetDefaults: () => void,
] => {
  const createConfiguration = useGenericObjectState<BaseMetricRequest>({
    modelId: modelId,
    requestName: '',
    protectedAttribute: '',
    privilegedAttribute: '',
    unprivilegedAttribute: '',
    outcomeName: '',
    favorableOutcome: '',
    thresholdDelta: 0.1,
    batchSize: 5000,
  });

  const [, setCreateData] = createConfiguration;

  const existingModelId = existingData?.modelId ?? modelId;
  const existingName = existingData?.name ?? '';
  const existingProtectedAttribute = existingData?.protectedAttribute ?? '';
  const existingPrivilegedAttribute = existingData?.privilegedAttribute ?? '';
  const existingUnprivilegedAttribute = existingData?.unprivilegedAttribute ?? '';
  const existingOutcomeName = existingData?.outcomeName ?? '';
  const existingFavorableOutcome = existingData?.favorableOutcome ?? '';
  const existingThresholdDelta = existingData?.thresholdDelta ?? 0.1;
  const existingBatchSize = existingData?.batchSize ?? 5000;

  React.useEffect(() => {
    if (existingData) {
      setCreateData('modelId', existingModelId);
      setCreateData('requestName', '');
      setCreateData('protectedAttribute', existingProtectedAttribute);
      setCreateData('privilegedAttribute', existingPrivilegedAttribute);
      setCreateData('unprivilegedAttribute', existingUnprivilegedAttribute);
      setCreateData('outcomeName', existingOutcomeName);
      setCreateData('favorableOutcome', existingFavorableOutcome);
      setCreateData('thresholdDelta', existingThresholdDelta);
      setCreateData('batchSize', existingBatchSize);
    }
  }, [
    setCreateData,
    existingData,
    existingModelId,
    existingName,
    existingProtectedAttribute,
    existingPrivilegedAttribute,
    existingUnprivilegedAttribute,
    existingOutcomeName,
    existingFavorableOutcome,
    existingThresholdDelta,
    existingBatchSize,
  ]);

  return createConfiguration;
};

export default useBiasConfigurationObject;
