import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CapabilityPicker from '~/app/AIAssets/components/CapabilityPicker';

describe('CapabilityPicker', () => {
  let mockOnChange: jest.Mock;

  beforeEach(() => {
    mockOnChange = jest.fn();
  });

  it('renders selected capabilities as Labels', () => {
    render(
      <CapabilityPicker
        selectedCapabilities={['vision', 'audio-transcription']}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByTestId('selected-capability-vision')).toHaveTextContent('Vision');
    expect(screen.getByTestId('selected-capability-audio-transcription')).toHaveTextContent(
      'Transcription',
    );
  });

  it('removes a capability when clicking the Label close button', async () => {
    const user = userEvent.setup();
    render(
      <CapabilityPicker
        selectedCapabilities={['vision', 'audio-transcription']}
        onChange={mockOnChange}
      />,
    );

    const visionLabel = screen.getByTestId('selected-capability-vision');
    const closeBtn = visionLabel.querySelector('button');
    expect(closeBtn).not.toBeNull();
    await user.click(closeBtn!);

    expect(mockOnChange).toHaveBeenCalledWith(['audio-transcription']);
  });

  it('opens dropdown when clicking "+ Add capability"', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={[]} onChange={mockOnChange} />);

    const addBtn = screen.getByTestId('add-capability-btn');
    await user.click(addBtn);

    expect(screen.getByText('Common capabilities')).toBeInTheDocument();
  });

  it('adds a common capability when selecting from dropdown', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={[]} onChange={mockOnChange} />);

    await user.click(screen.getByTestId('add-capability-btn'));
    const visionItem = await screen.findByTestId('common-capability-vision');
    await user.click(within(visionItem).getByRole('menuitem'));

    expect(mockOnChange).toHaveBeenCalledWith(['vision']);
  });

  it('excludes already-selected capabilities from the dropdown', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={['vision']} onChange={mockOnChange} />);

    await user.click(screen.getByTestId('add-capability-btn'));

    expect(screen.queryByTestId('common-capability-vision')).not.toBeInTheDocument();
    expect(screen.getByTestId('common-capability-audio-transcription')).toBeInTheDocument();
  });

  it('hides "Common capabilities" group when all common caps are selected', async () => {
    const user = userEvent.setup();
    render(
      <CapabilityPicker
        selectedCapabilities={['vision', 'audio-transcription']}
        onChange={mockOnChange}
      />,
    );

    await user.click(screen.getByTestId('add-capability-btn'));

    expect(screen.queryByText('Common capabilities')).not.toBeInTheDocument();
  });

  it('adds a custom capability via text input + Enter', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={[]} onChange={mockOnChange} />);

    await user.click(screen.getByTestId('add-capability-btn'));
    const input = screen.getByTestId('custom-capability-input');
    await user.type(input, 'My Custom Cap{Enter}');

    expect(mockOnChange).toHaveBeenCalledWith(['my-custom-cap']);
  });

  it('adds a custom capability via Add button click', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={[]} onChange={mockOnChange} />);

    await user.click(screen.getByTestId('add-capability-btn'));
    const input = screen.getByTestId('custom-capability-input');
    await user.type(input, 'Speech Synthesis');
    await user.click(screen.getByTestId('add-custom-capability-btn'));

    expect(mockOnChange).toHaveBeenCalledWith(['speech-synthesis']);
  });

  it('does not add a duplicate custom capability', async () => {
    const user = userEvent.setup();
    render(<CapabilityPicker selectedCapabilities={['vision']} onChange={mockOnChange} />);

    await user.click(screen.getByTestId('add-capability-btn'));
    const input = screen.getByTestId('custom-capability-input');
    await user.type(input, 'vision{Enter}');

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('disables Add button and hides close buttons when isDisabled', async () => {
    render(
      <CapabilityPicker selectedCapabilities={['vision']} onChange={mockOnChange} isDisabled />,
    );

    const addBtn = screen.getByTestId('add-capability-btn');
    expect(addBtn).toBeDisabled();

    const visionLabel = screen.getByTestId('selected-capability-vision');
    const closeBtn = visionLabel.querySelector('button');
    expect(closeBtn).toBeNull();
  });
});
