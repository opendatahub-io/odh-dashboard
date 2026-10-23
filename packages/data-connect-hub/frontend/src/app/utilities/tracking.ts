import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { ConnectionType } from '~/app/types';

export const DATA_CONNECT_HUB_EVENT_NAMES = {
  addStarted: 'Connections Add Started',
  typeSelected: 'Connections Type Selected',
  connectionCreated: 'Connections Connection Created',
  createCanceled: 'Connections Create Canceled',
  deleteInitiated: 'Connections Connection Delete Initiated',
  listFilterApplied: 'Connections List Filter Applied',
} as const;

export type DataConnectHubConnectionSource =
  'connections_tab' | 'empty_state' | 'connection_type_catalog';
export type DataConnectHubCancelMethod = 'cancel_button' | 'close_x';
export type DataConnectHubAbandonStep =
  'type_selection' | 'connection_details' | 'configuration' | 'review';
export type DataConnectHubListFilterType = 'type' | 'name';

export type DataConnectHubEvent =
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.addStarted;
      properties: { project: string; source: DataConnectHubConnectionSource };
    }
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.typeSelected;
      properties: {
        connectionTypeProvider: string;
        isGlobalType: boolean;
        project: string;
      };
    }
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated;
      properties: {
        outcome: TrackingOutcome;
        success?: boolean;
        error?: string;
        connectionTypeProvider?: string;
        hasTags: boolean;
        tagCount: number;
        project: string;
      };
    }
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.createCanceled;
      properties: {
        cancelMethod: DataConnectHubCancelMethod;
        abandonStep: DataConnectHubAbandonStep;
        project: string;
        connectionTypeProvider?: string;
      };
    }
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.deleteInitiated;
      properties: { project: string; connectionTypeProvider: string };
    }
  | {
      eventName: typeof DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied;
      properties: { filterType: DataConnectHubListFilterType; project: string };
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const STATUS_CODE_KEY = 'status_code';

export const getConnectionTypeProvider = (
  connectionType?: Pick<ConnectionType, 'resource'>,
): string | undefined => connectionType?.resource.provider;

export const isGlobalConnectionType = (connectionType: Pick<ConnectionType, 'metadata'>): boolean =>
  !connectionType.metadata.tenant_id;

export const getCreateConnectionAbandonStep = (stepIndex: number): DataConnectHubAbandonStep => {
  if (stepIndex <= 1) {
    return 'type_selection';
  }
  if (stepIndex === 2) {
    return 'connection_details';
  }
  if (stepIndex === 3) {
    return 'configuration';
  }
  return 'review';
};

export const getConnectionCreationErrorCategory = (error: unknown): string => {
  if (error instanceof Error) {
    const match = error.message.match(
      /\b(?:status code|http status|http code|api error|http)[\s:=]{1,3}(\d{3})\b/i,
    );
    const status = match ? Number(match[1]) : undefined;
    if (status !== undefined && status >= 100 && status <= 599) {
      return `http_${status}`;
    }
  }

  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : {};
    const status = error.status ?? error.statusCode ?? error[STATUS_CODE_KEY] ?? response.status;
    if (typeof status === 'number' && status >= 100 && status <= 599) {
      return `http_${status}`;
    }
  }

  return 'unknown_error';
};

export const fireDataConnectHubTrackEvent = (event: DataConnectHubEvent): void => {
  if (event.eventName === DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated) {
    fireFormTrackingEvent(event.eventName, event.properties);
    return;
  }

  fireMiscTrackingEvent(event.eventName, event.properties);
};
