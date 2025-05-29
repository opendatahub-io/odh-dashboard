import { Label, LabelGroup } from '@patternfly/react-core';
import * as React from 'react';
import { TemplateKind } from '#~/k8sTypes';
import { getEnabledPlatformsFromTemplate } from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '#~/types';

type CustomServingRuntimePlatformsLabelGroupProps = {
  template: TemplateKind;
};

const ServingRuntimePlatformLabels = {
  [ServingRuntimePlatform.SINGLE]: 'Single-model',
  [ServingRuntimePlatform.MULTI]: 'Multi-model',
};

const CustomServingRuntimePlatformsLabelGroup: React.FC<
  CustomServingRuntimePlatformsLabelGroupProps
> = ({ template }) => {
  const platforms = getEnabledPlatformsFromTemplate(template);

  if (platforms.length === 0) {
    return null;
  }

  return (
    <LabelGroup data-testid="serving-runtime-platform-label">
      {platforms.map((platform, i) => (
        <Label color="purple" data-testid={`${platform}-model`} key={i}>
          {ServingRuntimePlatformLabels[platform]}
        </Label>
      ))}
    </LabelGroup>
  );
};

export default CustomServingRuntimePlatformsLabelGroup;
