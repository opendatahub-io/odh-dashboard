import * as React from 'react';
import { Popover, Button, Label } from '@patternfly/react-core';
import { PendingIcon } from '@patternfly/react-icons';

export enum ExternalModelsFilterOptions {
  keyword = 'keyword',
}

export const externalModelsFilterOptions = {
  [ExternalModelsFilterOptions.keyword]: 'Keyword',
};

export type ExternalModelsFilterDataType = Record<ExternalModelsFilterOptions, string | undefined>;

export const initialExternalModelsFilterData: ExternalModelsFilterDataType = {
  [ExternalModelsFilterOptions.keyword]: '',
};

export const deploymentsExternalPath = (namespace: string): string =>
  `/ai-hub/models/deployments/external/${namespace}`;

const GOVERNANCE_PAIRING_WARNING_BODY = (
  <div>
    <p>
      Consumers can&apos;t access this model until they are given access in a MaaS subscription and
      authorization policy from the <strong>MaaS governance</strong> page.
    </p>
  </div>
);

export const GovernancePairingWarning: React.FC = () => (
  <Popover
    headerContent="Pending MaaS governance"
    bodyContent={GOVERNANCE_PAIRING_WARNING_BODY}
    data-testid="external-model-governance-pairing-warning-popover"
  >
    <Button
      variant="plain"
      data-testid="external-model-governance-pairing-warning"
      aria-label="Awaiting governance pairing"
    >
      <Label color="purple" isCompact>
        <PendingIcon />
      </Label>
    </Button>
  </Popover>
);
