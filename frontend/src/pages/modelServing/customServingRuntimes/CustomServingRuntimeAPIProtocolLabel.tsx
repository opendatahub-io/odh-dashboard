import * as React from 'react';
import { Label, Text, TextVariants } from '@patternfly/react-core';
import { TemplateKind } from '~/k8sTypes';
import {
  getAPIProtocolFromTemplate,
  getEnabledPlatformsFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';

type CustomServingRuntimeAPIProtocolLabelProps = {
  template: TemplateKind;
};

const CustomServingRuntimeAPIProtocolLabel: React.FC<CustomServingRuntimeAPIProtocolLabelProps> = ({
  template,
}) => {
  const apiProtocol = getAPIProtocolFromTemplate(template);
  const isMultiModel = getEnabledPlatformsFromTemplate(template).includes(
    ServingRuntimePlatform.MULTI,
  );

  // If it is multi-model, we use REST as default
  if (!apiProtocol && isMultiModel) {
    return <Label color="gold">{ServingRuntimeAPIProtocol.REST}</Label>;
  }

  if (!apiProtocol || !Object.values(ServingRuntimeAPIProtocol).includes(apiProtocol)) {
    return <Text component={TextVariants.small}>Not defined</Text>;
  }

  return <Label color="gold">{apiProtocol}</Label>;
};

export default CustomServingRuntimeAPIProtocolLabel;
