import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  AUTORAG_EVENTS,
  fireAutoragExperimentCreated,
  fireAutoragKnowledgeSourceConfigured,
  fireAutoragProjectDropdownOptionSelected,
} from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);
const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);

describe('fireAutoragProjectDropdownOptionSelected', () => {
  it('should fire AutoRAG Project Dropdown Option Selected with the selected project', () => {
    fireAutoragProjectDropdownOptionSelected('test-namespace');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.PROJECT_DROPDOWN_OPTION_SELECTED,
      { selectedProject: 'test-namespace' },
    );
  });
});

describe('fireAutoragExperimentCreated', () => {
  it('should fire AutoRAG Experiment Created with outcome: submit and hasDescription: true', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.submit,
      hasDescription: true,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.submit,
      hasDescription: true,
      success: true,
    });
  });

  it('should fire AutoRAG Experiment Created with outcome: cancel and hasDescription: false', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
      success: true,
    });
  });

  it('should pass through success: false and error when provided', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.submit,
      hasDescription: false,
      success: false,
      error: 'boom',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.submit,
      hasDescription: false,
      success: false,
      error: 'boom',
    });
  });
});

describe('fireAutoragKnowledgeSourceConfigured', () => {
  it('should fire with knowledgeSourceType: s3 and outcome: submit', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 's3',
      countOfDocuments: 3,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 's3',
        countOfDocuments: 3,
        outcome: TrackingOutcome.submit,
        success: true,
      },
    );
  });

  it('should fire with outcome: cancel', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 's3',
        countOfDocuments: 0,
        outcome: TrackingOutcome.cancel,
        success: true,
      },
    );
  });

  it('should fire with knowledgeSourceType: upload, success: false and an error message', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 'upload',
      countOfDocuments: 0,
      outcome: TrackingOutcome.submit,
      success: false,
      error: 'boom',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 'upload',
        countOfDocuments: 0,
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'boom',
      },
    );
  });
});
