export const DATA_REGISTRY_EVENT_NAMES = {
  projectSwitched: 'Data Project Switched',
  searchPerformed: 'Data Registry Search Performed',
  registrationStarted: 'Data Registration Started',
  registrationCanceled: 'Data Registration Canceled',
  registered: 'Data Registered',
  assetTypeSelected: 'Data Asset Type Selected',
  formatSelected: 'Data Format Selected',
  connectionSelected: 'Data Connection Selected',
  collectionSelectionChanged: 'Data Collection Selection Changed',
  labelAdded: 'Data Label Added',
  assetOpened: 'Data Asset Opened',
  assetEditInitiated: 'Data Asset Edit Initiated',
  assetDeleteInitiated: 'Data Asset Delete Initiated',
} as const;

export type DataRegistryAssetType = 'structured' | 'unstructured';
export type DataRegistryCollectionBucket = 'default' | 'custom';

type DataRegistryEventProperties = Record<string, string | number | boolean | string[]>;

export type DataRegistryEvent =
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.projectSwitched;
      properties: { previousProject: string; selectedProject: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.searchPerformed;
      properties: { hasQuery: boolean; queryLength: number; resultCount: number; project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.registrationStarted;
      properties: { project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.registrationCanceled;
      properties: { cancelMethod: 'cancel_button' | 'close_x'; project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.registered;
      properties: {
        success: boolean;
        assetType: DataRegistryAssetType;
        format: string;
        hasConnection: boolean;
        hasCollection: boolean;
        labelCount: number;
        project: string;
        error?: string;
      };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.assetTypeSelected;
      properties: { assetType: DataRegistryAssetType; project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.formatSelected;
      properties: { format: string; project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.connectionSelected;
      properties: { project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.collectionSelectionChanged;
      properties: {
        initialCollection: 'none';
        selectedCollection: DataRegistryCollectionBucket;
        project: string;
      };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.labelAdded;
      properties: { project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.assetOpened;
      properties: { project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.assetEditInitiated;
      properties: { project: string };
    }
  | {
      eventName: typeof DATA_REGISTRY_EVENT_NAMES.assetDeleteInitiated;
      properties: { project: string };
    };

export type DataRegistryTrackEvent = (
  eventName: string,
  properties: DataRegistryEventProperties,
) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const STATUS_CODE_KEY = 'status_code';

export const getRegistrationErrorCategory = (error: unknown): string => {
  if (error instanceof Error) {
    const match = error.message.match(/(?:status code|status|code)\D+(\d{3})\b/i);
    if (match) {
      return `http_${match[1]}`;
    }
  }

  if (isRecord(error)) {
    const status = error.status ?? error.statusCode ?? error[STATUS_CODE_KEY];
    if (typeof status === 'number' && status >= 100 && status <= 599) {
      return `http_${status}`;
    }
  }

  return 'unknown_error';
};

export const toDataRegistryTrackEvent = (
  trackEvent: DataRegistryTrackEvent,
  event: DataRegistryEvent,
): void => {
  try {
    trackEvent(event.eventName, event.properties);
  } catch {
    // Telemetry must never interrupt the user workflow.
  }
};
