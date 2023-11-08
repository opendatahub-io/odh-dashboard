import * as React from 'react';
import { ServingRuntimeKind } from '~/k8sTypes';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';

type Props = {
  servingRuntime?: ServingRuntimeKind;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime }) => (
  <>{servingRuntime ? getDisplayNameFromServingRuntimeTemplate(servingRuntime) : 'Unknown'}</>
);

export default InferenceServiceServingRuntime;
