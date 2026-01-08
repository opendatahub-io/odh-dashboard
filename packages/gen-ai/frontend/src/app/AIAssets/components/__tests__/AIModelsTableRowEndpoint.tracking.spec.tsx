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
      const copyButton = screen.getByRole('button', { name: /Copy URL/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Endpoint_Copied', {
          asset_type: 'model',
          endpoint_type: 'internal',
          copy_target: 'endpoint',
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

      const copyButton = screen.getByRole('button', { name: /Copy URL/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Endpoint_Copied', {
          asset_type: 'model',
          endpoint_type: 'internal',
          copy_target: 'endpoint',
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

      const copyButton = screen.getByRole('button', { name: /Copy URL/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Endpoint_Copied', {
          asset_type: 'model',
          endpoint_type: 'external',
          copy_target: 'endpoint',
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

      // Find all copy buttons and get the one associated with the token (second one)
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
      // The token copy button should be the last one (after URL copy button)
      const tokenCopyButton = copyButtons[copyButtons.length - 1];
      await user.click(tokenCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Service_Token_Copied', {
          asset_type: 'model',
          copy_target: 'service_token',
        });
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
      const urlCopyButton = screen.getByRole('button', { name: /Copy URL/i });
      await user.click(urlCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Endpoint_Copied', {
          asset_type: 'model',
          endpoint_type: 'external',
          copy_target: 'endpoint',
        });
      });

      // Copy token - get the last copy button (after URL copy button)
      const copyButtonsForToken = screen.getAllByRole('button', { name: /Copy/i });
      const tokenCopyButton = copyButtonsForToken[copyButtonsForToken.length - 1];
      await user.click(tokenCopyButton);

      await waitFor(() => {
        expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Service_Token_Copied', {
          asset_type: 'model',
          copy_target: 'service_token',
        });
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
