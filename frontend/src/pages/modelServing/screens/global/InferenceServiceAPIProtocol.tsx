import * as React from 'react';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import { ServingRuntimeKind } from '#~/k8sTypes';
import { getAPIProtocolFromServingRuntime } from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeAPIProtocol } from '#~/types';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  isMultiModel?: boolean;
};

const InferenceServiceAPIProtocol: React.FC<Props> = ({ servingRuntime, isMultiModel }) => {
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
