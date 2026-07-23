import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { SortableData } from '@odh-dashboard/ui-core';
import * as React from 'react';
import {
  ExternalModelsInfoPopoverLocation,
  MaaSEvents,
  ExternalModelsInfoPopoverTarget,
} from '~/app/types/event-tracking';
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
    label: 'Provider',
    field: 'externalProvider',
    width: 30,
    sortable: false,
    info: {
      popover:
        'The provider that supplies the endpoint and credentials for this model. A model can reference multiple providers for load balancing.',
      popoverProps: {
        onShow: (): void => {
          fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_INFO_POPOVER_VIEWED, {
            infoTarget: ExternalModelsInfoPopoverTarget.COLUMN_EXTERNAL_PROVIDER,
            location: ExternalModelsInfoPopoverLocation.TABLE_HEADER,
          });
        },
      },
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
          The model&apos;s status. A second status appears when the model is waiting for MaaS
          governance setup - for example, when a MaaS subscription or authorization policy
          hasn&apos;t been configured yet.
        </>
      ),
      popoverProps: {
        onShow: (): void => {
          fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODELS_INFO_POPOVER_VIEWED, {
            infoTarget: ExternalModelsInfoPopoverTarget.COLUMN_STATUS,
            location: ExternalModelsInfoPopoverLocation.TABLE_HEADER,
          });
        },
      },
    },
  },
];
