import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import EvaluationTemplateModal from '~/app/components/configure/EvaluationTemplateModal';
import * as tracking from '~/app/utilities/tracking';

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutoragEvaluationTemplateDownloaded: jest.fn(),
}));

const fireAutoragEvaluationTemplateDownloadedMock = jest.mocked(
  tracking.fireAutoragEvaluationTemplateDownloaded,
);

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
    render(<EvaluationTemplateModal onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('evaluation-template-download-button'));

    expect(fireAutoragEvaluationTemplateDownloadedMock).toHaveBeenCalledTimes(1);
    expect(fireAutoragEvaluationTemplateDownloadedMock).toHaveBeenCalledWith();
  });

  it('should not fire tracking when the modal is only closed', () => {
    const onCloseMock = jest.fn();
    render(<EvaluationTemplateModal onClose={onCloseMock} />);

    fireEvent.click(screen.getByTestId('evaluation-template-close-button'));

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(fireAutoragEvaluationTemplateDownloadedMock).not.toHaveBeenCalled();
  });
});
