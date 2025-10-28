/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { AIModel } from '~/app/types';
import AIModelsTableRowEndpoint from '~/app/AIAssets/components/AIModelsTableRowEndpoint';

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

describe('AIModelsTableRowEndpoint', () => {
  describe('Internal endpoint', () => {
    it('should render "Not available" when internal endpoint is not configured', () => {
      const model = createMockAIModel({ internalEndpoint: undefined });
      render(<AIModelsTableRowEndpoint model={model} />);

      expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('should render "View URL" button when internal endpoint is available', () => {
      const model = createMockAIModel({ internalEndpoint: 'http://internal.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} />);

      expect(screen.getByText('View URL')).toBeInTheDocument();
    });

    it('should show popover content when "View URL" is clicked', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ internalEndpoint: 'http://internal.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      expect(screen.getByText('Internal endpoint URL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('http://internal.endpoint')).toBeInTheDocument();
    });

    it('should show "Not available" popover when internal endpoint is missing', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ internalEndpoint: undefined });
      render(<AIModelsTableRowEndpoint model={model} />);

      const notAvailableLabel = screen.getByText('Not available');
      await user.click(notAvailableLabel);

      expect(screen.getByText(/No internal endpoint has been configured/i)).toBeInTheDocument();
    });
  });

  describe('External endpoint', () => {
    it('should render "Not available" when external endpoint is not configured', () => {
      const model = createMockAIModel({ externalEndpoint: undefined });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('should render "View URL" button when external endpoint is available', () => {
      const model = createMockAIModel({ externalEndpoint: 'http://external.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      expect(screen.getByText('View URL')).toBeInTheDocument();
    });

    it('should show popover content when "View URL" is clicked', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ externalEndpoint: 'http://external.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      expect(screen.getByText('External endpoint URL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('http://external.endpoint')).toBeInTheDocument();
    });

    it('should show API token when available for external endpoint', async () => {
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

      expect(screen.getByText('API token')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-token-123')).toBeInTheDocument();
    });

    it('should not show API token when token is empty for external endpoint', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({
        externalEndpoint: 'http://external.endpoint',
        sa_token: {
          name: 'token-name',
          token_name: 'token',
          token: '',
        },
      });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      expect(screen.queryByText('API token')).not.toBeInTheDocument();
    });

    it('should show "Not available" popover when external endpoint is missing', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ externalEndpoint: undefined });
      render(<AIModelsTableRowEndpoint model={model} isExternal />);

      const notAvailableLabel = screen.getByText('Not available');
      await user.click(notAvailableLabel);

      expect(screen.getByText(/No external endpoint has been configured/i)).toBeInTheDocument();
    });
  });

  describe('Clipboard functionality', () => {
    it('should render ClipboardCopy for internal endpoint URL', async () => {
      const user = userEvent.setup();
      const model = createMockAIModel({ internalEndpoint: 'http://internal.endpoint' });
      render(<AIModelsTableRowEndpoint model={model} />);

      const viewButton = screen.getByText('View URL');
      await user.click(viewButton);

      const clipboardCopy = screen.getByDisplayValue('http://internal.endpoint');
      expect(clipboardCopy).toBeInTheDocument();
    });

    it('should render ClipboardCopy for external endpoint URL and token', async () => {
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

      expect(screen.getByDisplayValue('http://external.endpoint')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-token-123')).toBeInTheDocument();
    });
  });
});
