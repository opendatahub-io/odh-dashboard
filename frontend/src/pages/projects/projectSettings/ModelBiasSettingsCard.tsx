import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import React from 'react';
import TrustyAIServiceControl from '~/concepts/trustyai/content/TrustyAIServiceControl';

type ModelBiasSettingsCardProps = {
  namespace: string;
};
const ModelBiasSettingsCard: React.FC<ModelBiasSettingsCardProps> = ({ namespace }) => (
  <Card isFlat>
    <CardHeader>
      <CardTitle>Model Bias</CardTitle>
    </CardHeader>
    <CardBody>
      <TrustyAIServiceControl namespace={namespace} />
    </CardBody>
  </Card>
);

export default ModelBiasSettingsCard;
