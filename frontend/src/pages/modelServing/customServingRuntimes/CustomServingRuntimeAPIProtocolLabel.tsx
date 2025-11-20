import * as React from 'react';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import { TemplateKind } from '#~/k8sTypes';
import { getAPIProtocolFromTemplate } from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeAPIProtocol } from '#~/types';

type CustomServingRuntimeAPIProtocolLabelProps = {
  template: TemplateKind;
};

const CustomServingRuntimeAPIProtocolLabel: React.FC<CustomServingRuntimeAPIProtocolLabelProps> = ({
  template,
}) => {
  const apiProtocol = getAPIProtocolFromTemplate(template);

  if (!apiProtocol || !Object.values(ServingRuntimeAPIProtocol).includes(apiProtocol)) {
    return <Content component={ContentVariants.small}>Not defined</Content>;
  }

  return <Label color="yellow">{apiProtocol}</Label>;
};

export default CustomServingRuntimeAPIProtocolLabel;
