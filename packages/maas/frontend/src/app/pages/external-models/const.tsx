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

const MISSING_MAAS_MODEL_REF_BODY = (
  <div>
    <p>
      This external model does not have a MaaS model reference. A MaaS model reference is required
      for subscriptions, authorization policies, and API key generation.
    </p>
  </div>
);

const MISSING_MAAS_MODEL_REF_FOOTER =
  'Create a MaaS model reference to enable governance features and allow consumers to access this model through the gateway.';

export const MissingMaaSModelRefWarning: React.FC = () => (
  <Popover
    headerContent="MaaS model reference required"
    bodyContent={MISSING_MAAS_MODEL_REF_BODY}
    footerContent={MISSING_MAAS_MODEL_REF_FOOTER}
    data-testid="external-model-missing-maas-model-ref-popover"
  >
    <Button
      variant="plain"
      data-testid="external-model-missing-maas-model-ref"
      aria-label="Missing MaaS model reference"
    >
      <Label color="purple" isCompact>
        <PendingIcon />
      </Label>
    </Button>
  </Popover>
);

const GOVERNANCE_PAIRING_WARNING_BODY = (
  <div>
    <p>
      This model is awaiting governance pairing. An active subscription and authorization policy are
      required before consumers can access the gateway endpoint.
    </p>
  </div>
);

const GOVERNANCE_PAIRING_WARNING_FOOTER =
  'Consumers will also need an API key to authenticate requests. API keys can be generated from the API keys page in GenAI Studio.';

export const GovernancePairingWarning: React.FC = () => (
  <Popover
    headerContent="Not ready for consumption"
    bodyContent={GOVERNANCE_PAIRING_WARNING_BODY}
    footerContent={GOVERNANCE_PAIRING_WARNING_FOOTER}
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
