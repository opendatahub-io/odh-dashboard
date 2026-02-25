/* eslint-disable camelcase */
import { useQuery } from '@tanstack/react-query';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import {
  usePromptsList,
  usePromptVersions,
} from '~/app/Chatbot/components/promptManagementModal/usePromptQueries';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({
    api: {
      listMLflowPrompts: jest.fn(),
      listMLflowPromptVersions: jest.fn(),
      getMLflowPrompt: jest.fn(),
    },
    apiAvailable: true,
  })),
}));

const mockUseQuery = jest.mocked(useQuery);

const mockPrompts: MLflowPrompt[] = [
  {
    name: 'test-prompt-1',
    description: 'A test prompt',
    latest_version: 2,
    tags: { env: 'dev' },
    creation_timestamp: '2024-01-15T10:00:00Z',
  },
  {
    name: 'test-prompt-2',
    description: 'Another test prompt',
    latest_version: 1,
    tags: {},
    creation_timestamp: '2024-01-10T08:00:00Z',
  },
];

const mockVersions: MLflowPromptVersion[] = [
  {
    name: 'test-prompt-1',
    version: 2,
    template: 'You are a helpful assistant.',
    commit_message: 'Updated prompt',
    tags: { env: 'dev' },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    name: 'test-prompt-1',
    version: 1,
    template: 'You are an assistant.',
    commit_message: 'Initial version',
    tags: {},
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
];

describe('usePromptsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptsList)();

    expect(result.current.prompts).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return prompts when loaded successfully', () => {
    mockUseQuery.mockReturnValue({
      data: mockPrompts,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptsList)();

    expect(result.current.prompts).toEqual(mockPrompts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return empty array when no prompts exist', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptsList)();

    expect(result.current.prompts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return error when API fails', () => {
    const mockError = new Error('Failed to fetch prompts');
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptsList)();

    expect(result.current.prompts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should pass filter options to query', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    testHook(usePromptsList)({ maxResults: 10, filterName: 'test' });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['prompts', 'list', { maxResults: 10, filterName: 'test' }],
      }),
    );
  });
});

describe('usePromptVersions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptVersions)('test-prompt-1');

    expect(result.current.versions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return versions when loaded successfully', () => {
    mockUseQuery.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptVersions)('test-prompt-1');

    expect(result.current.versions).toEqual(mockVersions);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return empty array when prompt name is null', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptVersions)(null);

    expect(result.current.versions).toEqual([]);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('should return error when API fails', () => {
    const mockError = new Error('Failed to fetch versions');
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    } as ReturnType<typeof useQuery>);

    const { result } = testHook(usePromptVersions)('test-prompt-1');

    expect(result.current.versions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should include prompt name in query key', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    testHook(usePromptVersions)('my-prompt');

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['prompts', 'my-prompt', 'versions'],
      }),
    );
  });
});
