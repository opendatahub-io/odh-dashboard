import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import SupportedFileTypesModal, {
  SupportedFileTypesLink,
} from '~/app/components/common/SupportedFileTypesModal';

describe('SupportedFileTypesModal', () => {
  it('should render the verified supported file types and transcription copy', () => {
    render(<SupportedFileTypesModal isOpen onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Supported file types' })).toBeInTheDocument();
    expect(screen.getByText('Audio: .m4a, .mp3, .wav')).toBeInTheDocument();
    expect(
      screen.getByText('Audio files are transcribed with Whisper Tiny before processing.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\.flac|\.ogg/)).not.toBeInTheDocument();
  });

  it('should call onClick when the supported file types link is activated', () => {
    const onClick = jest.fn();
    render(<SupportedFileTypesLink onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'View supported file types' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
