import { SortableData } from '@odh-dashboard/ui-core';
import * as React from 'react';
import { ExternalModel } from '~/app/types/external-models';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';

export const externalModelsColumns: SortableData<ExternalModel>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Model',
    field: 'model',
    width: 40,
    sortable: (a: ExternalModel, b: ExternalModel): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'External provider',
    field: 'externalProvider',
    width: 30,
    sortable: false,
    info: {
      popover:
        'The ExternalProvider resource that supplies the endpoint and credentials for this model. One model can reference multiple providers for weighted traffic routing.',
    },
  },
  {
    label: 'Status',
    field: 'phase',
    width: 30,
    sortable: (a: ExternalModel, b: ExternalModel): number =>
      normalizePhase(a.phase).localeCompare(normalizePhase(b.phase)),
    info: {
      popover: (
        <>
          The reconciliation phase of the ExternalModel resource. &quot;Ready&quot; means all
          networking resources were created successfully. &quot;Pending&quot; means reconciliation
          is in progress. &quot;Failed&quot; means an error occurred — such as a missing provider,
          missing Secret, a missing config key referenced in the path, or network policy issue.
          <br />
          <br />A warning icon next to the status indicates that the model is not yet consumable —
          typically because a subscription, authorization policy, or both have not been configured.
          Consumers also need an API key to send requests.
        </>
      ),
    },
  },
];
