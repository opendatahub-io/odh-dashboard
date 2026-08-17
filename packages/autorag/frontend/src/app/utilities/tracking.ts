import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export { TrackingOutcome };

export const AUTORAG_EVENTS = {
  PROJECT_DROPDOWN_OPTION_SELECTED: 'AutoRAG Project Dropdown Option Selected',
  EXPERIMENT_CREATED: 'AutoRAG Experiment Created',
  KNOWLEDGE_SOURCE_CONFIGURED: 'AutoRAG Knowledge Source Configured',
} as const;

export const fireAutoragProjectDropdownOptionSelected = (selectedProject: string): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PROJECT_DROPDOWN_OPTION_SELECTED, { selectedProject });
};

export type ExperimentCreatedProperties = {
  outcome: TrackingOutcome;
  hasDescription: boolean;
  success?: boolean;
  error?: string;
};

/**
 * Fires when the user leaves the "Define Details" (name/description/connection) step of the
 * create-experiment flow — either moving forward (outcome: submit) or cancelling out
 * (outcome: cancel). This is a pure local step transition with no backend call, so `success` is
 * always `true` and `error` is omitted when submitting (the Next button is disabled until the
 * step's fields are valid). Full run configuration metadata (optimization metric, source types,
 * models, vector DB) is captured later, on AutoRAG Run Triggered, once the Knowledge/Eval/Models
 * sections of the configure step are also complete.
 */
export const fireAutoragExperimentCreated = (properties: ExperimentCreatedProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.EXPERIMENT_CREATED, properties);
};

export type KnowledgeSourceType = 's3' | 'upload';

export type KnowledgeSourceConfiguredProperties = {
  knowledgeSourceType: KnowledgeSourceType;
  countOfDocuments: number;
  outcome: TrackingOutcome;
  success: boolean;
  error?: string;
};

/**
 * Fires when the user completes (or abandons) the "Knowledge setup" milestone on the configure
 * step — selecting a file/folder from an S3 connection via the file browser, or uploading a file
 * directly. `outcome: submit` covers both a successful selection/upload and a failed upload
 * attempt (see `success`/`error`); `outcome: cancel` fires when the S3 browser is dismissed
 * without a selection being made.
 */
export const fireAutoragKnowledgeSourceConfigured = (
  properties: KnowledgeSourceConfiguredProperties,
): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED, properties);
};
