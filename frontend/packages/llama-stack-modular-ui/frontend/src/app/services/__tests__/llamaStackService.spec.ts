/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable camelcase */
import { mockLlamaModels } from '~/src/__mocks__/llamaStackModels';
import axios from '@app/utilities/axios';
import { authService } from '@app/services/authService';
import { listModels, completeChat, type ChatMessage } from '@app/services/llamaStackService';

// Mock axios
jest.mock('@app/utilities/axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock authService
jest.mock('@app/services/authService');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Mock global fetch
const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe('llamaStackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('listModels', () => {
    it('should successfully fetch models', async () => {
      const mockResponse = {
        data: {
          data: mockLlamaModels,
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await listModels();

      expect(mockedAxios.get).toHaveBeenCalledWith('/llama-stack/v1/models');
      expect(result).toEqual(mockLlamaModels);
    });

    it('should handle 401 error with specific message', async () => {
      const mockError = {
        response: {
          status: 401,
        },
        message: 'Unauthorized',
      };
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(listModels()).rejects.toThrow(
        'You are authenticated but do not have permission to access models. Please contact your administrator for access.',
      );

      expect(mockedAxios.get).toHaveBeenCalledWith('/llama-stack/v1/models');
    });

    it('should handle 403 error with specific message', async () => {
      const mockError = {
        response: {
          status: 403,
        },
        message: 'Forbidden',
      };
      mockedAxios.get.mockRejectedValue(mockError);

      try {
        await listModels();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toBe(
            'You are authenticated but do not have permission to access models. Please contact your administrator for access.',
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((error as any).status).toBe(403);
        }
      }
    });

    it('should handle API error with custom message', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
      };
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(listModels()).rejects.toThrow('Internal server error');
    });

    it('should handle network error with generic message', async () => {
      const mockError = {
        message: 'Network Error',
      };
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(listModels()).rejects.toThrow('Network Error');
    });

    it('should handle error without response or message', async () => {
      const mockError = {};
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(listModels()).rejects.toThrow('Failed to fetch models');
    });
  });

  describe('completeChat', () => {
    const mockMessages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!', stop_reason: 'stop' },
      { role: 'user', content: 'How are you?' },
    ];
    const mockModelId = 'llama-3.1-8b-instruct';
    const mockToken = 'test-auth-token';

    it('should successfully complete chat with authentication token', async () => {
      const mockResponse = 'I am doing well, thank you for asking!';
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await completeChat(mockMessages, mockModelId);

      expect(mockFetch).toHaveBeenCalledWith('/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!', stop_reason: 'stop' },
            { role: 'user', content: 'How are you?' },
          ],
          model_id: mockModelId,
        }),
      });
      expect(result).toBe(mockResponse);
    });

    it('should successfully complete chat without authentication token', async () => {
      const mockResponse = 'Response without auth';
      mockedAuthService.getToken.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await completeChat(mockMessages, mockModelId);

      expect(mockFetch).toHaveBeenCalledWith('/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!', stop_reason: 'stop' },
            { role: 'user', content: 'How are you?' },
          ],
          model_id: mockModelId,
        }),
      });
      expect(result).toBe(mockResponse);
    });

    it('should add stop_reason to assistant messages without it', async () => {
      const messagesWithoutStopReason: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }, // Missing stop_reason
      ];
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('Response'),
      });

      await completeChat(messagesWithoutStopReason, mockModelId);

      expect(mockFetch).toHaveBeenCalledWith('/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!', stop_reason: 'stop' },
          ],
          model_id: mockModelId,
        }),
      });
    });

    it('should handle HTTP error response', async () => {
      const mockErrorText = 'Bad Request';
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue(mockErrorText),
      });

      await expect(completeChat(mockMessages, mockModelId)).rejects.toThrow(mockErrorText);
    });

    it('should handle HTTP error response without text', async () => {
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue(''),
      });

      await expect(completeChat(mockMessages, mockModelId)).rejects.toThrow(
        'Failed to fetch chat completion',
      );
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network connection failed');
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockRejectedValue(networkError);

      await expect(completeChat(mockMessages, mockModelId)).rejects.toThrow(
        'Network connection failed',
      );
    });

    it('should handle error without message', async () => {
      const errorWithoutMessage = {};
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockRejectedValue(errorWithoutMessage);

      await expect(completeChat(mockMessages, mockModelId)).rejects.toThrow(
        'Chat completion error',
      );
    });

    it('should preserve existing stop_reason in assistant messages', async () => {
      const messagesWithStopReason: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!', stop_reason: 'length' },
      ];
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('Response'),
      });

      await completeChat(messagesWithStopReason, mockModelId);

      expect(mockFetch).toHaveBeenCalledWith('/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!', stop_reason: 'length' },
          ],
          model_id: mockModelId,
        }),
      });
    });

    it('should not modify user messages', async () => {
      const userOnlyMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'How are you?' },
      ];
      mockedAuthService.getToken.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('Response'),
      });

      await completeChat(userOnlyMessages, mockModelId);

      expect(mockFetch).toHaveBeenCalledWith('/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'user', content: 'How are you?' },
          ],
          model_id: mockModelId,
        }),
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed response data in listModels', async () => {
      const mockResponse = {
        data: null,
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(listModels()).rejects.toThrow();
    });

    it('should handle undefined response in listModels', async () => {
      mockedAxios.get.mockResolvedValue(undefined);

      await expect(listModels()).rejects.toThrow();
    });

    it('should handle fetch throwing non-Error object in completeChat', async () => {
      mockedAuthService.getToken.mockReturnValue('token');
      mockFetch.mockRejectedValue('String error');

      await expect(completeChat([], 'model')).rejects.toThrow('Chat completion error');
    });
  });
});
