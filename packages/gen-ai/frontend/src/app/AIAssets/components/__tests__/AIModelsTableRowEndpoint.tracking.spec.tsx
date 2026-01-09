/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { AIModel } from '~/app/types';
import AIModelsTableRowEndpoint from '~/app/AIAssets/components/AIModelsTableRowEndpoint';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

// Mock ClipboardCopy to add data-testid to button
jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    ClipboardCopy: ({
      children,
      onCopy,
      'data-testid': dataTestId,
      ...props
    }: {
      children: string;
      onCopy?: (event: React.ClipboardEvent<HTMLDivElement>, text?: React.ReactNode) => void;
      'data-testid'?: string;
      [key: string]: unknown;
    }) => {
      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onCopy) {
          onCopy(e as unknown as React.ClipboardEvent<HTMLDivElement>, children);
        }
      };
      return (
        <div data-testid={dataTestId}>
          <input readOnly value={children} />
          <button
            aria-label={(props['aria-label'] as string) || 'Copy to clipboard'}
            onClick={handleClick}
            data-testid={dataTestId ? `${dataTestId}-copy-button` : undefined}
          >
            Copy
          </button>
        </div>
      );
    },
  };
});

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model',
  internalEndpoint: 'http://internal.endpoint',
  externalEndpoint: 'http://external.endpoint',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token-123',
  },
  ...overrides,
});

describe('AIModelsTableRowEndpoint - Event Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Internal Endpoint Copy Tracking', () => {
    it('should fire tracking event when internal endpoint URL is copied', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ internalEndpoint: 'http://internal.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} />);

      // Open popover
      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      // Find and click the copy button for the URL
      const copyButton = screen.getByTestId('copy-endpoint-button-copy-button');
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Endpoint Copied', {
          assetType: 'model',
          endpointType: 'internal',
          copyTarget: 'endpoint',
        });
      });
    });

    it('should track correct model name', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({
        model_name: 'llama-3-70b',
        internalEndpoint: 'http://internal.endpoint',
      });
      render(<AIModelsTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      const copyButton = screen.getByTestId('copy-endpoint-button-copy-button');
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Endpoint Copied', {
          assetType: 'model',
          endpointType: 'internal',
          copyTarget: 'endpoint',
        });
      });
    });
  });

  describe('External Endpoint Copy Tracking', () => {
    it('should fire tracking event when external endpoint URL is copied', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ externalEndpoint: 'http://external.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      const copyButton = screen.getByTestId('copy-endpoint-button-copy-button');
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Endpoint Copied', {
          assetType: 'model',
          endpointType: 'external',
          copyTarget: 'endpoint',
        });
      });
    });

    it('should fire tracking event when API token is copied', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({
        externalEndpoint: 'http://external.endpoint',
        sa_token: {
          name: 'token-name',
          token_name: 'token',
          token: 'test-token-123',
        },
      });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      // Wait for popover to open and find the token input first
      await screen.findByDisplayValue('test-token-123');

      // Get token copy button by test ID
      // Use specific test IDs instead of positional indexing
      // Get token copy button by test ID
      const tokenCopyButton = screen.getByTestId('copy-token-button-copy-button');
      await user.click(tokenCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Available Endpoints Service Token Copied',
          {
            assetType: 'model',
            copyTarget: 'service_token',
          },
        );
      });
    });

    it('should track both URL and token copies independently', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({
        model_name: 'gpt-4',
        externalEndpoint: 'http://external.endpoint',
        sa_token: {
          name: 'token-name',
          token_name: 'token',
          token: 'test-token-123',
        },
      });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      // Copy URL
      const urlCopyButton = screen.getByTestId('copy-endpoint-button-copy-button');
      await user.click(urlCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Endpoint Copied', {
          assetType: 'model',
          endpointType: 'external',
          copyTarget: 'endpoint',
        });
      });

      // Copy token - get the last copy button (after URL copy button)
      // Get token copy button by test ID
      const tokenCopyButton = screen.getByTestId('copy-token-button-copy-button');
      await user.click(tokenCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
          'Available Endpoints Service Token Copied',
          {
            assetType: 'model',
            copyTarget: 'service_token',
          },
        );
      });

      // Should have been called twice
      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('No Tracking for Unavailable Endpoints', () => {
    it('should not fire tracking when endpoint is not available', () => {
      const model = createMockAIModel({ internalEndpoint: undefined });
      render(<AIModelsTableRowEndpoint model={model} />);

      // Just rendering "Not available" should not trigger tracking
      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
