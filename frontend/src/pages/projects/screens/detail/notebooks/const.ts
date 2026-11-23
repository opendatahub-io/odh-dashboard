export enum NotebookImageAvailability {
  DISABLED = 'Disabled',
  ENABLED = 'Enabled',
}

export enum NotebookImageStatus {
  DELETED = 'Deleted',
  LATEST = 'Latest',
  DEPRECATED = 'Deprecated',
}

export const KUEUE_ANOMALY_POPOVER_BODY =
  "This workbench doesn't use Kueue scheduling. To enable it, edit the workbench and assign a hardware profile with a local queue.";
