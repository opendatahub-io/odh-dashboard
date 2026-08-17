import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export { TrackingOutcome };

export const AUTORAG_EVENTS = {
  PROJECT_DROPDOWN_OPTION_SELECTED: 'AutoRAG Project Dropdown Option Selected',
  EXPERIMENT_CREATED: 'AutoRAG Experiment Created',
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
