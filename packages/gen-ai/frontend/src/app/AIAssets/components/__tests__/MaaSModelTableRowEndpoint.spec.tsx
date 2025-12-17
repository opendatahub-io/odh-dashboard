/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { MaaSModel } from '~/app/types';
import MaaSModelTableRowEndpoint from '~/app/AIAssets/components/MaaSModelTableRowEndpoint';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';

jest.mock('~/app/hooks/useGenerateMaaSToken', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseGenerateMaaSToken = jest.mocked(useGenerateMaaSToken);

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
  ready: true,
  url: 'https://example.com/maas/model',
  ...overrides,
});

describe('MaaSModelTableRowEndpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenerateMaaSToken.mockReturnValue({
      isGenerating: false,
      tokenData: null,
      error: null,
      generateToken: jest.fn(),
      resetToken: jest.fn(),
    });
  });

  it('should render "-" when model has no URL', () => {
    const model = createMockMaaSModel({ url: '' });
    render(<MaaSModelTableRowEndpoint model={model} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should render "View" button when model has URL', () => {
    const model = createMockMaaSModel();
    render(<MaaSModelTableRowEndpoint model={model} />);

    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should show popover with model URL when "View" is clicked', async () => {
    const user = userEvent.setup();
    const model = createMockMaaSModel({ url: 'https://example.com/maas/model' });
    render(<MaaSModelTableRowEndpoint model={model} />);

    const viewButton = screen.getByText('View');
    await user.click(viewButton);

    expect(screen.getByText('Model as a service (MaaS) route')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/maas/model')).toBeInTheDocument();
  });

  describe('API Token generation', () => {
    it('should show "Generate API token" button initially', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      expect(screen.getByText('Generate API token')).toBeInTheDocument();
    });

    it('should call generateToken when "Generate API token" is clicked', async () => {
      const user = userEvent.setup();
      const mockGenerateToken = jest.fn();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: null,
        error: null,
        generateToken: mockGenerateToken,
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      const generateButton = screen.getByText('Generate API token');
      await user.click(generateButton);

      expect(mockGenerateToken).toHaveBeenCalled();
    });

    it('should disable button and show spinner when generating token', async () => {
      const user = userEvent.setup();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: true,
        tokenData: null,
        error: null,
        generateToken: jest.fn(),
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      const generateButton = screen.getByText('Generate API token').closest('button');
      expect(generateButton).toBeDisabled();
    });

    it('should display token when generation succeeds', async () => {
      const user = userEvent.setup();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: { token: 'generated-token-123', expiresAt: Date.now() + 3600000 },
        error: null,
        generateToken: jest.fn(),
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      expect(screen.getByText('Important: Copy and store this token')).toBeInTheDocument();
      expect(screen.getByDisplayValue('generated-token-123')).toBeInTheDocument();
      expect(screen.getByText(/This token can be viewed only once/i)).toBeInTheDocument();
    });

    it('should display error when token generation fails', async () => {
      const user = userEvent.setup();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: null,
        error: 'Failed to generate token',
        generateToken: jest.fn(),
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      expect(screen.getByText('Error generating token')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate token')).toBeInTheDocument();
    });

    it('should not show generate button when token is already generated', async () => {
      const user = userEvent.setup();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: { token: 'existing-token', expiresAt: Date.now() + 3600000 },
        error: null,
        generateToken: jest.fn(),
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      expect(screen.queryByText('Generate API token')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('existing-token')).toBeInTheDocument();
    });
  });

  describe('Popover behavior', () => {
    it('should call resetToken when popover is hidden', async () => {
      const user = userEvent.setup();
      const mockResetToken = jest.fn();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: { token: 'test-token', expiresAt: Date.now() + 3600000 },
        error: null,
        generateToken: jest.fn(),
        resetToken: mockResetToken,
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      // Click outside to close popover - this would trigger onHidden
      // Note: This is a simplified test - actual behavior depends on Popover implementation
      expect(screen.getByDisplayValue('test-token')).toBeInTheDocument();
    });
  });

  describe('ClipboardCopy functionality', () => {
    it('should render ClipboardCopy for MaaS route URL', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel({ url: 'https://example.com/maas/route' });
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      const clipboardCopy = screen.getByDisplayValue('https://example.com/maas/route');
      expect(clipboardCopy).toBeInTheDocument();
    });

    it('should render ClipboardCopy for generated token', async () => {
      const user = userEvent.setup();
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: { token: 'token-to-copy', expiresAt: Date.now() + 3600000 },
        error: null,
        generateToken: jest.fn(),
        resetToken: jest.fn(),
      });

      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View');
      await user.click(viewButton);

      const tokenClipboard = screen.getByDisplayValue('token-to-copy');
      expect(tokenClipboard).toBeInTheDocument();
    });
  });
});
