import * as React from 'react';
import { Popover, Button } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

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

const CONFIG_STATUS_WARNING_BODY = (
  <div>
    <p>
      This model has no active subscription and authorization policy pairing. Both are required
      before consumers can access the gateway endpoint.
    </p>
  </div>
);

const CONFIG_STATUS_WARNING_FOOTER =
  'Consumers will also need an API key to authenticate requests. API keys can be generated from the API keys page in GenAI Studio.';

export const ConfigStatusWarning: React.FC = () => (
  <Popover
    headerContent="Not ready for consumption"
    bodyContent={CONFIG_STATUS_WARNING_BODY}
    footerContent={CONFIG_STATUS_WARNING_FOOTER}
  >
    <Button
      variant="plain"
      data-testid="external-model-config-warning"
      aria-label="Configuration warning"
    >
      <ExclamationTriangleIcon color="orange" />
    </Button>
  </Popover>
);
