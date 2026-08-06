import * as React from 'react';
import { Popover, Button, Label } from '@patternfly/react-core';
import { PendingIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  ExternalModelsInfoPopoverLocation,
  ExternalModelsInfoPopoverTarget,
  MaaSEvents,
} from '~/app/types/event-tracking';

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
      MaaS governance features (subscriptions, authorization policies, API keys) require a
      MaaSModelRef resource that references this external model. This resource must be deployed in
      the same namespace as the external model.
    </p>
  </div>
);

export const MissingMaaSModelRefWarning: React.FC = () => (
  <Popover
    headerContent="Missing MaaS model setup"
    bodyContent={MISSING_MAAS_MODEL_REF_BODY}
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
      Consumers can&apos;t access this model yet. A MaaS subscription and authorization policy must
      be configured on the <strong>MaaS governance</strong> page.
    </p>
  </div>
);

export const GovernancePairingWarning: React.FC = () => (
  <Popover
    headerContent="Missing MaaS governance setup"
    bodyContent={GOVERNANCE_PAIRING_WARNING_BODY}
    data-testid="external-model-governance-pairing-warning-popover"
  >
    <Button
      variant="plain"
      data-testid="external-model-governance-pairing-warning"
      aria-label="Missing governance pairing"
      onClick={() => {
        fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_INFO_POPOVER_VIEWED, {
          infoTarget: ExternalModelsInfoPopoverTarget.SECONDARY_STATUS,
          location: ExternalModelsInfoPopoverLocation.TABLE_CELL,
        });
      }}
    >
      <Label color="purple" isCompact>
        <PendingIcon />
      </Label>
    </Button>
  </Popover>
);
