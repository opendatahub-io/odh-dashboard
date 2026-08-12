import React from 'react';
import { Label, LabelGroup, Tooltip } from '@patternfly/react-core';
import {
  parseModelCapabilities,
  getModelCapabilityLabelColor,
} from '../../shared/modelCapabilities';
import { Deployment } from '../../../extension-points';

type DeploymentCapabilitiesProps = {
  deployment: Deployment;
};

const MAX_INLINE_LABELS = 2;

const DeploymentCapabilities: React.FC<DeploymentCapabilitiesProps> = ({
  deployment: { model },
}) => {
  const capabilities = parseModelCapabilities(model.metadata.annotations);

  if (!capabilities || capabilities.length === 0) {
    return <>-</>;
  }

  const visibleCapabilities = capabilities.slice(0, MAX_INLINE_LABELS);
  const overflowCount = capabilities.length - MAX_INLINE_LABELS;

  return (
    <LabelGroup data-testid="deployment-capabilities">
      {visibleCapabilities.map((capability) => (
        <Label
          key={capability}
          isCompact
          color={getModelCapabilityLabelColor(capability)}
          data-testid="deployment-capability-label"
        >
          {capability}
        </Label>
      ))}
      {overflowCount > 0 && (
        <Tooltip content={capabilities.join(', ')}>
          <Label isCompact variant="overflow">{`+${overflowCount}`}</Label>
        </Tooltip>
      )}
    </LabelGroup>
  );
};

export default DeploymentCapabilities;
