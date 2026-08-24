import React from 'react';
import { Label, LabelGroup, Tooltip } from '@patternfly/react-core';
import {
  parseModelCapabilities,
  getModelCapabilityLabelColor,
  normalizeModelCapability,
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
      {visibleCapabilities.map((capability, index) => (
        <Label
          key={`${capability}-${index}`}
          isCompact
          color={getModelCapabilityLabelColor(capability)}
          data-testid="deployment-capability-label"
        >
          {normalizeModelCapability(capability)}
        </Label>
      ))}
      {overflowCount > 0 && (
        <Tooltip content={capabilities.map(normalizeModelCapability).join(', ')}>
          <Label
            isCompact
            variant="overflow"
            data-testid="capability-overflow-label"
          >{`+${overflowCount}`}</Label>
        </Tooltip>
      )}
    </LabelGroup>
  );
};

export default DeploymentCapabilities;
