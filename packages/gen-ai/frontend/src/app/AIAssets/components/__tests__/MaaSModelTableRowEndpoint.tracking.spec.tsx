import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { MaaSModel } from '~/app/types';
import MaaSModelTableRowEndpoint from '~/app/AIAssets/components/MaaSModelTableRowEndpoint';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

// Mock ClipboardCopy to trigger onCopy callback
jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    ClipboardCopy: ({
      children,
      onCopy,
      'data-testid': dataTestId,
    }: {
      children: string;
      onCopy?: (text: string, event: React.MouseEvent) => void;
      'data-testid'?: string;
    }) => {
      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Simulate successful clipboard write
        if (onCopy) {
          onCopy('', e);
        }
      };
      return (
        <div data-testid={dataTestId}>
          <input readOnly value={children} />
          <button aria-label="Copy to clipboard" onClick={handleClick}>
            Copy
          </button>
        </div>
      );
    },
  };
});

// Mock useGenerateMaaSToken hook
const mockGenerateToken = jest.fn();
const mockResetToken = jest.fn();

jest.mock('~/app/hooks/useGenerateMaaSToken', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isGenerating: false,
    tokenData: { token: 'generated-token-123', expiration: '2024-12-31' },
    error: null,
    generateToken: mockGenerateToken,
    resetToken: mockResetToken,
  })),
}));

const mockUseGenerateMaaSToken = jest.mocked(useGenerateMaaSToken);

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org', // eslint-disable-line camelcase
  ready: true,
  url: 'https://maas.example.com/model',
  ...overrides,
});

describe('MaaSModelTableRowEndpoint - Event Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('MaaS Token Copy Tracking', () => {
    it('should fire tracking event when MaaS API token is copied', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      // Open popover
      const viewButton = screen.getByTestId('maas-view-button');
      await user.click(viewButton);

      // Wait for token to appear
      await screen.findByDisplayValue('generated-token-123');

      // Find the copy button inside the token ClipboardCopy component
      const tokenCopyContainer = screen.getByTestId('maas-token-copy');
      const tokenCopyButton = tokenCopyContainer.querySelector(
        'button[aria-label="Copy to clipboard"]',
      );

      // Click and wait for async clipboard operation
      await user.click(tokenCopyButton!);

      // Flush all promises to ensure clipboard write completes
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 0);
      });

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Service_Token_Copied', {
          assetType: 'maas_model',
          copyTarget: 'service_token',
        });
      });
    });

    it('should fire tracking event only when copy button is clicked', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      // Open popover - should not trigger tracking
      const viewButton = screen.getByTestId('maas-view-button');
      await user.click(viewButton);

      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();

      // Wait for token to appear
      await screen.findByDisplayValue('generated-token-123');

      // Click copy button - should trigger tracking
      const tokenCopyContainer = screen.getByTestId('maas-token-copy');
      const tokenCopyButton = tokenCopyContainer.querySelector(
        'button[aria-label="Copy to clipboard"]',
      );
      await user.click(tokenCopyButton!);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Service_Token_Copied', {
          assetType: 'maas_model',
          copyTarget: 'service_token',
        });
      });
    });

    it('should track multiple copy actions', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel();
      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByTestId('maas-view-button');
      await user.click(viewButton);

      // Wait for token to appear
      await screen.findByDisplayValue('generated-token-123');

      const tokenCopyContainer = screen.getByTestId('maas-token-copy');
      const tokenCopyButton = tokenCopyContainer.querySelector(
        'button[aria-label="Copy to clipboard"]',
      );

      // Copy first time
      await user.click(tokenCopyButton!);
      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);
      });

      // Copy second time
      await user.click(tokenCopyButton!);
      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(2);
      });

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Service_Token_Copied', {
        assetType: 'maas_model',
        copyTarget: 'service_token',
      });
    });
  });

  describe('No Tracking for URL Copy', () => {
    it('should not fire token copy tracking when URL is copied', async () => {
      const user = userEvent.setup();
      const model = createMockMaaSModel();

      // Mock useGenerateMaaSToken to return no token initially
      mockUseGenerateMaaSToken.mockReturnValue({
        isGenerating: false,
        tokenData: null,
        error: null,
        generateToken: mockGenerateToken,
        resetToken: mockResetToken,
      });

      render(<MaaSModelTableRowEndpoint model={model} />);

      const viewButton = screen.getByTestId('maas-view-button');
      await user.click(viewButton);

      // Copy the URL using the endpoint copy button
      const urlCopyContainer = screen.getByTestId('maas-endpoint-copy');
      const urlCopyButton = urlCopyContainer.querySelector(
        'button[aria-label="Copy to clipboard"]',
      );
      await user.click(urlCopyButton!);

      // Should fire Endpoint_Copied but not Service_Token_Copied
      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Endpoint_Copied', {
          assetType: 'maas_model',
          endpointType: 'maas_route',
          copyTarget: 'endpoint',
        });
      });
      expect(fireMiscTrackingEvent).not.toHaveBeenCalledWith(
        'Service_Token_Copied',
        expect.any(Object),
      );
    });
  });

  describe('No Model URL', () => {
    it('should not render anything when model has no URL', () => {
      const model = createMockMaaSModel({ url: undefined });
      const { container } = render(<MaaSModelTableRowEndpoint model={model} />);

      expect(container.textContent).toBe('-');
      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
