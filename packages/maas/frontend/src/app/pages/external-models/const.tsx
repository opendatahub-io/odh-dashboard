import * as React from 'react';
import { Popover, Button } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ExternalModelConfigStatus } from '~/app/types/external-models';

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

export const CONFIG_STATUS_WARNING_BODY: Record<
  Exclude<ExternalModelConfigStatus, 'Ready'>,
  React.ReactNode
> = {
  NoConfig: (
    <div>
      <p>
        This model has no subscription or authorization policy configured. Both are required before
        consumers can access the gateway endpoint.
      </p>
    </div>
  ),
  NoSub: (
    <div>
      <p>
        This model has no subscriptions. Without a subscription, no token rate limits are configured
        and the model cannot be called through the MaaS API gateway.
      </p>
    </div>
  ),
  NoAuth: (
    <div>
      <p>
        This model has no authorization policy configured. An authorization policy is required to
        control which users and services can send requests.
      </p>
    </div>
  ),
};

const CONFIG_STATUS_WARNING_FOOTER =
  'Consumers will also need an API key to authenticate requests. API keys can be generated from the API keys page in GenAI Studio.';

type ConfigStatusWarningProps = {
  configStatus: Exclude<ExternalModelConfigStatus, 'Ready'>;
};

export const ConfigStatusWarning: React.FC<ConfigStatusWarningProps> = ({ configStatus }) => (
  <Popover
    headerContent="Not ready for consumption"
    bodyContent={CONFIG_STATUS_WARNING_BODY[configStatus]}
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
