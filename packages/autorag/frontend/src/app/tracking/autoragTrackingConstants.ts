export const AUTORAG_EVENTS = {
  PIPELINE_RUN_CREATED: 'AutoRAG Pipeline Run Created',
  PIPELINE_RUN_STOPPED: 'AutoRAG Pipeline Run Stopped',
  PIPELINE_RUN_DELETED: 'AutoRAG Pipeline Run Deleted',
  PIPELINE_RUN_RETRIED: 'AutoRAG Pipeline Run Retried',
  PATTERN_TRIED: 'AutoRAG Pattern Tried',
  PATTERN_CODE_VIEWED: 'AutoRAG Pattern Code Viewed',
  OGX_CONNECTION_CREATED: 'AutoRAG OGX Connection Created',
  RUN_RECONFIGURED: 'AutoRAG Run Reconfigured',
  PATTERN_DETAILS_DOWNLOADED: 'AutoRAG Pattern Details Downloaded',
  NOTEBOOK_SAVED: 'AutoRAG Notebook Saved',
} as const;
