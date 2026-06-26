import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenAgentProfileModal, {
  OPEN_AGENT_MODAL_DISMISSED_KEY,
} from '~/app/agentProfile/OpenAgentProfileModal';

describe('OpenAgentProfileModal', () => {
  const defaultProps = {
    displayName: 'HR Bot',
    onPreview: jest.fn(),
    onEdit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render the modal with the agent display name in bold', () => {
    render(<OpenAgentProfileModal {...defaultProps} />);

    expect(screen.getByTestId('open-agent-profile-modal')).toBeInTheDocument();
    expect(screen.getByText('Open this agent?')).toBeInTheDocument();
    expect(screen.getByText('HR Bot')).toBeInTheDocument();
    // Name should be wrapped in <strong>
    expect(screen.getByText('HR Bot').tagName).toBe('STRONG');
  });

  it('should render Preview, Edit, and Cancel buttons', () => {
    render(<OpenAgentProfileModal {...defaultProps} />);

    expect(screen.getByTestId('open-agent-profile-preview-button')).toBeInTheDocument();
    expect(screen.getByTestId('open-agent-profile-edit-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should render the "Don\'t show this message again" checkbox unchecked by default', () => {
    render(<OpenAgentProfileModal {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: /don't show this message again/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('should call onPreview when Preview is clicked', async () => {
    const user = userEvent.setup();
    render(<OpenAgentProfileModal {...defaultProps} />);

    await user.click(screen.getByTestId('open-agent-profile-preview-button'));

    expect(defaultProps.onPreview).toHaveBeenCalledTimes(1);
    expect(defaultProps.onEdit).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('should call onEdit when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(<OpenAgentProfileModal {...defaultProps} />);

    await user.click(screen.getByTestId('open-agent-profile-edit-button'));

    expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
    expect(defaultProps.onPreview).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<OpenAgentProfileModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onPreview (enter read-only mode) when the modal close button is clicked', async () => {
    const user = userEvent.setup();
    render(<OpenAgentProfileModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(defaultProps.onPreview).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  describe('"Don\'t show this message again" persistence', () => {
    it('should NOT write to localStorage when checkbox is unchecked and Preview is clicked', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} />);

      await user.click(screen.getByTestId('open-agent-profile-preview-button'));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBeNull();
    });

    it('should NOT write to localStorage when checkbox is unchecked and Edit is clicked', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} />);

      await user.click(screen.getByTestId('open-agent-profile-edit-button'));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBeNull();
    });

    it('should write to localStorage when checkbox is checked and Preview is clicked', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /don't show this message again/i }));
      await user.click(screen.getByTestId('open-agent-profile-preview-button'));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBe('true');
    });

    it('should write to localStorage when checkbox is checked and Edit is clicked', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /don't show this message again/i }));
      await user.click(screen.getByTestId('open-agent-profile-edit-button'));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBe('true');
    });

    it('should NOT write to localStorage when checkbox is checked but Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} />);

      await user.click(screen.getByRole('checkbox', { name: /don't show this message again/i }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBeNull();
    });
  });

  describe('validation warnings', () => {
    const warnings = [
      'Model "fake-model" is no longer available.',
      'MCP server "gone-server" is no longer available.',
    ];

    it('should render the warning alert listing each warning', () => {
      render(<OpenAgentProfileModal {...defaultProps} validationWarnings={warnings} />);

      expect(screen.getByTestId('open-agent-profile-warning-alert')).toBeInTheDocument();
      expect(screen.getByText('Model "fake-model" is no longer available.')).toBeInTheDocument();
      expect(
        screen.getByText('MCP server "gone-server" is no longer available.'),
      ).toBeInTheDocument();
    });

    it('should disable the Edit button when warnings are present', () => {
      render(<OpenAgentProfileModal {...defaultProps} validationWarnings={warnings} />);

      expect(screen.getByTestId('open-agent-profile-edit-button')).toBeDisabled();
    });

    it('should hide the "Don\'t show this message again" checkbox when warnings are present', () => {
      render(<OpenAgentProfileModal {...defaultProps} validationWarnings={warnings} />);

      expect(
        screen.queryByRole('checkbox', { name: /don't show this message again/i }),
      ).not.toBeInTheDocument();
    });

    it('should not write to localStorage even if Preview is clicked when warnings are present', async () => {
      const user = userEvent.setup();
      render(<OpenAgentProfileModal {...defaultProps} validationWarnings={warnings} />);

      await user.click(screen.getByTestId('open-agent-profile-preview-button'));

      expect(localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY)).toBeNull();
    });

    it('should not render the warning alert when validationWarnings is empty', () => {
      render(<OpenAgentProfileModal {...defaultProps} validationWarnings={[]} />);

      expect(screen.queryByTestId('open-agent-profile-warning-alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('open-agent-profile-edit-button')).not.toBeDisabled();
    });

    it('should not render the warning alert when validationWarnings is undefined', () => {
      render(<OpenAgentProfileModal {...defaultProps} />);

      expect(screen.queryByTestId('open-agent-profile-warning-alert')).not.toBeInTheDocument();
    });
  });
});
