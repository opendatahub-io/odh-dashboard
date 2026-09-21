import * as React from 'react';
import { List, ListItem } from '@patternfly/react-core';
import { SortableData } from '@odh-dashboard/ui-core';
import { ExternalProvider } from '~/app/types/external-models';

const endpointPopoverContent: React.ReactNode = (
  <>
    The provider&apos;s hostname - for example, <em>api.openai.com</em>. Requests are routed here.
  </>
);

const authMechanismPopoverContent: React.ReactNode = (
  <>
    The method by which the system authenticates with the provider.
    <List>
      <ListItem>
        <strong>API key:</strong> A secret token used to authenticate API requests.
      </ListItem>
      <ListItem>
        <strong>Signature Version 4:</strong> Uses AWS credentials (access key and secret) to sign
        requests.
      </ListItem>
      <ListItem>
        <strong>OAuth 2:</strong> Authenticates using an OAuth 2.0 client credentials flow.
      </ListItem>
    </List>
  </>
);

export const externalProvidersColumns: SortableData<ExternalProvider>[] = [
  {
    label: 'Name',
    field: 'name',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Type',
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
      popover: endpointPopoverContent,
    },
  },
  {
    label: 'Authentication type',
    field: 'authMechanism',
    width: 10,
    sortable: (a: ExternalProvider, b: ExternalProvider): number =>
      a.authMechanism.localeCompare(b.authMechanism),
    info: {
      popover: authMechanismPopoverContent,
    },
  },
  {
    label: 'Credential secret',
    field: 'credentialSecretRef',
    width: 10,
    sortable: false,
    info: {
      popover: 'The secret that stores credentials for this provider.',
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
