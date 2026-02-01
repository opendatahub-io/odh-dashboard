import * as React from 'react';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getAPIProtocolFromServingRuntime } from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeAPIProtocol } from '#~/types';
import { isNIMOperatorManaged } from './nimOperatorUtils';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  inferenceService?: InferenceServiceKind;
  isMultiModel?: boolean;
};

const InferenceServiceAPIProtocol: React.FC<Props> = ({
  servingRuntime,
  inferenceService,
  isMultiModel,
}) => {
  // Check if this is a NIM Operator-managed deployment
  // All NVIDIA NIM models use REST API (OpenAI-compatible HTTP endpoints)
  if (inferenceService && isNIMOperatorManaged(inferenceService)) {
    return <Label color="yellow">{ServingRuntimeAPIProtocol.REST}</Label>;
  }

  const apiProtocol =
    (servingRuntime && getAPIProtocolFromServingRuntime(servingRuntime)) ?? undefined;

  // If it is multi-model, we use REST as default
  if (!apiProtocol && isMultiModel) {
    return <Label color="yellow">{ServingRuntimeAPIProtocol.REST}</Label>;
  }

  if (!apiProtocol || !Object.values(ServingRuntimeAPIProtocol).includes(apiProtocol)) {
    return <Content component={ContentVariants.small}>Not defined</Content>;
  }

  return <Label color="yellow">{apiProtocol}</Label>;
};
export default InferenceServiceAPIProtocol;
