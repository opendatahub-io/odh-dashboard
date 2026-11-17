import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import EvaluationTemplateModal from '~/app/components/configure/EvaluationTemplateModal';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

const trackEventMock = jest.fn();

describe('EvaluationTemplateModal', () => {
  beforeEach(() => {
    // jsdom does not implement these URL APIs; the download button's Blob-based download flow
    // needs them to exist even though the resulting object URL is never asserted against here.
    Object.defineProperty(global.URL, 'createObjectURL', {
      value: jest.fn().mockReturnValue('blob:mock-url'),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.URL, 'revokeObjectURL', {
      value: jest.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('should fire AutoRAG Evaluation Template Downloaded when the download button is clicked', () => {
    render(
      <TrackingProvider trackEvent={trackEventMock}>
        <EvaluationTemplateModal onClose={jest.fn()} />
      </TrackingProvider>,
    );

    const template = screen.getByText(/"correct_answer_document_keys"/);
    expect(template).toHaveTextContent('"correct_answer_document_keys"');

    fireEvent.click(screen.getByTestId('evaluation-template-download-button'));

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith('AutoRAG Evaluation Template Downloaded', {
      downloadType: 'evaluationTemplate',
    });
  });

  it('should use replacement host tracking for download without emitting on rerender', () => {
    const replacement = jest.fn();
    const { rerender } = render(
      <TrackingProvider trackEvent={trackEventMock}>
        <EvaluationTemplateModal onClose={jest.fn()} />
      </TrackingProvider>,
    );
    rerender(
      <TrackingProvider trackEvent={replacement}>
        <EvaluationTemplateModal onClose={jest.fn()} />
      </TrackingProvider>,
    );
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('evaluation-template-download-button'));
    expect(replacement.mock.calls).toEqual([
      ['AutoRAG Evaluation Template Downloaded', { downloadType: 'evaluationTemplate' }],
    ]);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it('should not fire tracking when the modal is only closed', () => {
    const onCloseMock = jest.fn();
    render(
      <TrackingProvider trackEvent={trackEventMock}>
        <EvaluationTemplateModal onClose={onCloseMock} />
      </TrackingProvider>,
    );

    fireEvent.click(screen.getByTestId('evaluation-template-close-button'));

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
