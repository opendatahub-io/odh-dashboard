/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AIModel } from '~/app/types';
import AIModelsTableRowInfo from '~/app/AIAssets/components/AIModelsTableRowInfo';

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id-123',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model Display Name',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  model_source_type: 'namespace',
  ...overrides,
});

describe('AIModelsTableRowInfo', () => {
  it('should render model display name', () => {
    const model = createMockAIModel({ display_name: 'My Custom Model' });
    render(<AIModelsTableRowInfo model={model} />);

    expect(screen.getByText('My Custom Model')).toBeInTheDocument();
  });

  it('should render model info with correct structure', () => {
    const model = createMockAIModel({ display_name: 'Test Display' });
    render(<AIModelsTableRowInfo model={model} />);

    expect(screen.getByText('Test Display')).toBeInTheDocument();
  });

  it('should render Embedding badge for embedding models', () => {
    const model = createMockAIModel({ model_type: 'embedding' });
    render(<AIModelsTableRowInfo model={model} />);

    expect(screen.getByText('Embedding')).toBeInTheDocument();
  });

  it('should not render Embedding badge for non-embedding models', () => {
    const model = createMockAIModel();
    render(<AIModelsTableRowInfo model={model} />);

    expect(screen.queryByText('Embedding')).not.toBeInTheDocument();
  });

  describe('ASR badge', () => {
    it('should render ASR badge when model has audio-transcription capability', () => {
      const model = createMockAIModel({ capabilities: ['audio-transcription'] });
      render(<AIModelsTableRowInfo model={model} />);

      expect(screen.getByText('ASR')).toBeInTheDocument();
    });

    it('should render ASR badge with data-testid asr-badge', () => {
      const model = createMockAIModel({ capabilities: ['audio-transcription'] });
      render(<AIModelsTableRowInfo model={model} />);

      expect(screen.getByTestId('asr-badge')).toBeInTheDocument();
    });

    it('should not render ASR badge for standard LLM models', () => {
      const model = createMockAIModel();
      render(<AIModelsTableRowInfo model={model} />);

      expect(screen.queryByText('ASR')).not.toBeInTheDocument();
    });

    it('should render both Embedding and ASR badges if model has both', () => {
      const model = createMockAIModel({
        model_type: 'embedding',
        capabilities: ['audio-transcription'],
      });
      render(<AIModelsTableRowInfo model={model} />);

      expect(screen.getByText('Embedding')).toBeInTheDocument();
      expect(screen.getByText('ASR')).toBeInTheDocument();
    });
  });
});
