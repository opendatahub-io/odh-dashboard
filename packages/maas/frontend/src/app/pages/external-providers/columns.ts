import { SortableData } from '@odh-dashboard/ui-core';
import { ExternalProvider } from '~/app/types/external-models';

export const externalProvidersColumns: SortableData<ExternalProvider>[] = [
  {
    label: 'External provider',
    field: 'name',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Provider type',
    field: 'provider',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      a.provider.localeCompare(b.provider),
    info: {
      popover:
        'The cloud or API provider this resource connects to (e.g. OpenAI, Anthropic, AWS Bedrock).',
    },
  },
  {
    label: 'Endpoint',
    field: 'endpoint',
    width: 10,
    sortable: false,
    info: {
      popover:
        'The base URL for the provider API. All external models referencing this provider send requests to this endpoint.',
    },
  },
  {
    label: 'Authentication',
    field: 'authMechanism',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      a.authMechanism.localeCompare(b.authMechanism),
    info: {
      popover: 'The authentication mechanism used to connect to the provider endpoint.',
    },
  },
  {
    label: 'Credential secret',
    field: 'credentialSecretRef',
    width: 10,
    sortable: false,
    info: {
      popover:
        'The Kubernetes Secret in the same namespace that holds the API key or credentials for this provider.',
    },
  },
  {
    label: 'Status',
    field: 'phase',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      (a.phase ?? '').localeCompare(b.phase ?? ''),
  },
];
