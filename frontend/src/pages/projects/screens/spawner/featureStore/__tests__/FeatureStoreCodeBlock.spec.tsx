import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureStoreCodeBlock from '#~/pages/projects/screens/spawner/featureStore/FeatureStoreCodeBlock';

describe('FeatureStoreCodeBlock', () => {
  let writeTextMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
  });

  it('should render content in the code block', () => {
    render(<FeatureStoreCodeBlock id="test-block" content="print('hello')" testId="code" />);
    expect(screen.getByTestId('code')).toHaveTextContent("print('hello')");
  });

  it('should copy content to clipboard on button click', async () => {
    render(<FeatureStoreCodeBlock id="test-block" content="some code" />);
    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('some code');
    });
  });

  it('should show success message after copying', async () => {
    render(<FeatureStoreCodeBlock id="test-block" content="some code" />);
    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Successfully copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('should handle clipboard API failure gracefully', async () => {
    writeTextMock.mockRejectedValue(new Error('Clipboard API not available'));

    render(<FeatureStoreCodeBlock id="test-block" content="some code" />);
    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('some code');
    });
    expect(screen.queryByText('Successfully copied to clipboard!')).not.toBeInTheDocument();
  });
});
