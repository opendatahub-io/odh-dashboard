import * as React from 'react';
import { Popover, Button, Label } from '@patternfly/react-core';
import { PendingIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  AddProviderReferenceSource,
  ExternalModelsInfoPopoverLocation,
  ExternalModelsInfoPopoverTarget,
  ExternalModelsInfoPopoverViewedProperties,
  MaaSEvents,
} from '~/app/types/event-tracking';

export type CreateExternalModelLocationState = {
  addProviderReferenceSource: AddProviderReferenceSource;
};

export const getAddProviderReferenceSourceFromLocationState = (
  state: unknown,
): AddProviderReferenceSource | undefined => {
  if (typeof state !== 'object' || state === null || !('addProviderReferenceSource' in state)) {
    return undefined;
  }
  const { addProviderReferenceSource } = state;
  if (
    addProviderReferenceSource === AddProviderReferenceSource.TOOLBAR ||
    addProviderReferenceSource === AddProviderReferenceSource.EMPTY_LIST
  ) {
    return addProviderReferenceSource;
  }
  return undefined;
};

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

export const createExternalModelPath = (namespace: string): string =>
  `${deploymentsExternalPath(namespace)}/register`;

export const editExternalModelPath = (namespace: string, modelName: string): string =>
  `${deploymentsExternalPath(namespace)}/${encodeURIComponent(modelName)}/edit`;

/** Matches CRD maxLength for spec.modelName and spec.externalProviderRefs[].targetModel. */
export const EXTERNAL_MODEL_FIELD_MAX_LENGTH = 253;

/** Matches CRD maxLength for spec.externalProviderRefs[].path. */
export const PROVIDER_REFERENCE_PATH_MAX_LENGTH = 512;

export const PROVIDER_REFERENCE_API_FORMATS = {
  'openai-chat': {
    label: 'OpenAI Chat',
    defaultPath: '/v1/chat/completions',
    pathHelper: 'Pre-filled with /v1/chat/completions — the standard OpenAI Chat Completions path.',
  },
  messages: {
    label: 'Anthropic Messages',
    defaultPath: '/v1/messages',
    pathHelper:
      'Pre-filled with /v1/messages — the Anthropic Messages API path. Auth uses the x-api-key header, not Bearer.',
  },
} as const;

export type ProviderReferenceApiFormat = keyof typeof PROVIDER_REFERENCE_API_FORMATS;

export const ProviderSource = {
  EXISTING: 'existing',
  CREATE_NEW: 'create-new',
} as const;

export type ProviderSourceType = (typeof ProviderSource)[keyof typeof ProviderSource];

export const PROVIDER_REFERENCE_API_FORMAT_OPTIONS = Object.entries(
  PROVIDER_REFERENCE_API_FORMATS,
).map(([key, value]) => ({
  key,
  label: value.label,
}));

export const INHERITED_CONFIG_PREVIEW_COUNT = 5;

export const ADD_PATH_PLACEHOLDER_HELPER =
  'Only the path uses {key} placeholders. {model} is filled automatically from the Target model ID. Other keys come from provider configuration — add a model override in Advanced settings only if this model needs a different value.';

export const EDIT_PATH_PLACEHOLDER_HELPER =
  'Wrap any key from the key-value pairs section in curly braces to insert its value — for example, /v1/projects/{project}/locations/{location}/chat/completions.';

export const EDIT_KEY_VALUE_PAIRS_DESCRIPTION =
  'Configuration keys and values for this model reference. These can be used as {key} placeholders in the path below. Inherited values from the provider you select or create above will appear here. To change provider-level key-value pairs, update them in the provider section above. Use model configuration to override inherited values or add new ones.';

export const EDIT_INHERITED_CONFIG_HELPER =
  'These values come from the external provider and are available for {key} resolution in the path. Add an override below to change a value for this model.';

export const CONFIG_EXAMPLES_HELPER = (
  <>
    For example, Vertex AI providers typically need <strong>project</strong> and{' '}
    <strong>location</strong> keys (e.g., project=my-gcp-project, location=us-central1). AWS Bedrock
    may need <strong>region</strong>.
  </>
);

export const WEIGHT_POPOVER_CONTENT =
  'Weights are relative integers that determine traffic distribution. The system calculates percentages from the ratio of all weights. Set to 0 to temporarily disable a provider without removing it. Example: weights of 5, 3, 2 result in 50%, 30%, 20% traffic split.';

export const EXCLUDED_FROM_ROUTING_POPOVER_CONTENT =
  'This provider reference will not receive any traffic but remains configured for easy re-enablement. Set weight to 1 or higher to include it in routing again. In the actual CRD, a weight of 0 removes the provider reference from active routing.';

export const PROVIDER_REFS_ZERO_TOTAL_WEIGHT_MESSAGE =
  'Total weight is 0. At least one provider reference must have a weight greater than 0.';

export const DISTRIBUTE_EQUALLY_POPOVER_CONTENT =
  'Resets all provider reference weights to 1, giving each provider an equal share of traffic. You can adjust individual weights afterwards.';

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
        } satisfies ExternalModelsInfoPopoverViewedProperties);
      }}
    >
      <Label color="purple" isCompact>
        <PendingIcon />
      </Label>
    </Button>
  </Popover>
);
