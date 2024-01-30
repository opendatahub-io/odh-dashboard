import { BaseMetricListResponse } from '~/api';
import { BiasMetricConfig } from '~/concepts/trustyai/types';

export const formatListResponse = (x: BaseMetricListResponse): BiasMetricConfig[] =>
  x.requests.map((m) => ({
    batchSize: m.request.batchSize,
    favorableOutcome: m.request.favorableOutcome.value,
    id: m.id,
    metricType: m.request.metricName,
    modelId: m.request.modelId,
    name: m.request.requestName,
    outcomeName: m.request.outcomeName,
    privilegedAttribute: m.request.privilegedAttribute.value,
    protectedAttribute: m.request.protectedAttribute,
    thresholdDelta: m.request.thresholdDelta,
    unprivilegedAttribute: m.request.unprivilegedAttribute.value,
  }));
