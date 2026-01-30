/* eslint-disable camelcase */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import useFetchGuardrailModels from '~/app/hooks/useFetchGuardrailModels';
import { GuardrailModelConfig } from '~/app/types';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock utilities/const to avoid asEnumMember error
jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

const mockUseFetchState = jest.mocked(useFetchState);

const mockGuardrailModels: GuardrailModelConfig[] = [
  {
    model_name: 'llama-guard-3',
    input_shield_id: 'trustyai_input',
    output_shield_id: 'trustyai_output',
  },
  {
    model_name: 'llama-guard-2',
    input_shield_id: 'trustyai_input_v2',
    output_shield_id: 'trustyai_output_v2',
  },
];

describe('useFetchGuardrailModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch guardrail models successfully', async () => {
    mockUseFetchState.mockReturnValue([mockGuardrailModels, true, undefined, jest.fn()]);

    const { result } = testHook(useFetchGuardrailModels)();

    await waitFor(() => {
      const { data, modelNames, loaded, error } = result.current;
      expect(data).toEqual(mockGuardrailModels);
      expect(modelNames).toEqual(['llama-guard-3', 'llama-guard-2']);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should return empty arrays when no guardrail models are available', async () => {
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);

    const { result } = testHook(useFetchGuardrailModels)();

    await waitFor(() => {
      const { data, modelNames, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(modelNames).toEqual([]);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle loading state correctly', async () => {
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);

    const { result } = testHook(useFetchGuardrailModels)();

    await waitFor(() => {
      const { data, modelNames, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(modelNames).toEqual([]);
      expect(loaded).toBe(false);
      expect(error).toBeUndefined();
    });
  });

  it('should return error when API fails', async () => {
    const mockError = new Error('Failed to fetch guardrail models');
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchGuardrailModels)();

    await waitFor(() => {
      const { data, modelNames, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(modelNames).toEqual([]);
      expect(loaded).toBe(false);
      expect(error?.message).toBe('Failed to fetch guardrail models');
    });
  });

  it('should derive model names from data', async () => {
    const singleModel: GuardrailModelConfig[] = [
      {
        model_name: 'custom-guard',
        input_shield_id: 'custom_input',
        output_shield_id: 'custom_output',
      },
    ];
    mockUseFetchState.mockReturnValue([singleModel, true, undefined, jest.fn()]);

    const { result } = testHook(useFetchGuardrailModels)();

    await waitFor(() => {
      const { modelNames } = result.current;
      expect(modelNames).toEqual(['custom-guard']);
    });
  });
});
