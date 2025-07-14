import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { BaseMetricRequestInput, BiasMetricType } from '#~/api';
import { getThresholdDefaultDelta } from '#~/pages/modelServing/screens/metrics/utils';

const useBiasConfigurationObject = (
  modelId: string,
  metricType?: BiasMetricType,
  existingData?: BiasMetricConfig,
): [
  data: BaseMetricRequestInput,
  setData: UpdateObjectAtPropAndValue<BaseMetricRequestInput>,
  resetDefaults: () => void,
] => {
  const createConfiguration = useGenericObjectState<BaseMetricRequestInput>({
    modelId,
    requestName: '',
    protectedAttribute: '',
    privilegedAttribute: '',
    unprivilegedAttribute: '',
    outcomeName: '',
    favorableOutcome: '',
    thresholdDelta: undefined,
    batchSize: 5000,
  });

  const [, setCreateData] = createConfiguration;

  const existingModelId = existingData?.modelId ?? modelId;
  const existingName = existingData?.name ? `Copy of ${existingData.name}` : '';
  const existingProtectedAttribute = existingData?.protectedAttribute ?? '';
  const existingPrivilegedAttribute = existingData?.privilegedAttribute ?? '';
  const existingUnprivilegedAttribute = existingData?.unprivilegedAttribute ?? '';
  const existingOutcomeName = existingData?.outcomeName ?? '';
  const existingFavorableOutcome = existingData?.favorableOutcome ?? '';
  const existingThresholdDelta =
    existingData?.thresholdDelta ?? getThresholdDefaultDelta(metricType);
  const existingBatchSize = existingData?.batchSize ?? 5000;

  React.useEffect(() => {
    if (existingData) {
      setCreateData('modelId', existingModelId);
      setCreateData('requestName', existingName);
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
