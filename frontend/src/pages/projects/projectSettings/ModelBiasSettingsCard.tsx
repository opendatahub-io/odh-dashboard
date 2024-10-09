import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import React from 'react';
import TrustyAIServiceControl from '~/concepts/trustyai/content/TrustyAIServiceControl';
import { KnownLabels, ProjectKind } from '~/k8sTypes';
import { TRUST_AI_NOT_SUPPORTED_TEXT } from '~/pages/projects/projectSettings/const';

type ModelBiasSettingsCardProps = {
  project: ProjectKind;
};
const ModelBiasSettingsCard: React.FC<ModelBiasSettingsCardProps> = ({ project }) => {
  const namespace = project.metadata.name;

  const isTrustySupported = project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === 'true';

  const disabledReason = isTrustySupported ? undefined : TRUST_AI_NOT_SUPPORTED_TEXT;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model bias</CardTitle>
      </CardHeader>
      <CardBody>
        <TrustyAIServiceControl
          namespace={namespace}
          disabled={!isTrustySupported}
          disabledReason={disabledReason}
        />
      </CardBody>
    </Card>
  );
};

export default ModelBiasSettingsCard;
