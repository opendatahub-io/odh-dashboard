import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CapabilityBadges from '~/app/components/CapabilityBadges';

describe('CapabilityBadges', () => {
  it('renders nothing when capabilities is undefined', () => {
    const { container } = render(<CapabilityBadges />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when capabilities is empty', () => {
    const { container } = render(<CapabilityBadges capabilities={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when only text-generation is present', () => {
    const { container } = render(<CapabilityBadges capabilities={['text-generation']} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Vision badge for vision capability', () => {
    render(<CapabilityBadges capabilities={['vision', 'text-generation']} />);
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByTestId('capability-badge-vision')).toBeInTheDocument();
  });

  it('renders Transcription badge for audio-transcription capability', () => {
    render(<CapabilityBadges capabilities={['audio-transcription']} />);
    expect(screen.getByText('Transcription')).toBeInTheDocument();
    expect(screen.getByTestId('capability-badge-audio-transcription')).toBeInTheDocument();
  });

  it('renders multiple badges', () => {
    render(
      <CapabilityBadges capabilities={['vision', 'audio-transcription', 'text-generation']} />,
    );
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Transcription')).toBeInTheDocument();
  });

  it('shows overflow indicator when more than maxVisible capabilities', () => {
    render(
      <CapabilityBadges
        capabilities={['vision', 'audio-transcription', 'some-new-cap']}
        maxVisible={2}
      />,
    );
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Transcription')).toBeInTheDocument();
    expect(screen.getByTestId('capability-overflow')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not show overflow when within maxVisible', () => {
    render(<CapabilityBadges capabilities={['vision', 'audio-transcription']} maxVisible={2} />);
    expect(screen.queryByTestId('capability-overflow')).not.toBeInTheDocument();
  });

  it('handles unknown capabilities with titleCase label', () => {
    render(<CapabilityBadges capabilities={['tool-calling']} />);
    expect(screen.getByText('Tool Calling')).toBeInTheDocument();
  });

  it('respects custom maxVisible', () => {
    render(
      <CapabilityBadges
        capabilities={['vision', 'audio-transcription', 'tool-calling']}
        maxVisible={1}
      />,
    );
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.queryByText('Transcription')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
