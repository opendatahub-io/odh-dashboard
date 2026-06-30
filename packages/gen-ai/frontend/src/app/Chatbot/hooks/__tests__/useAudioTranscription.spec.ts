import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioTranscription } from '~/app/Chatbot/hooks/useAudioTranscription';
import { uploadMediaFile, transcribeAudio } from '~/app/services/llamaStackService';

jest.mock('~/app/services/llamaStackService', () => ({
  uploadMediaFile: jest.fn(),
  transcribeAudio: jest.fn(),
}));

const mockUploadMediaFile = uploadMediaFile as jest.MockedFunction<typeof uploadMediaFile>;
const mockTranscribeAudio = transcribeAudio as jest.MockedFunction<typeof transcribeAudio>;

const createMockFile = (name = 'test.wav'): File =>
  new File(['audio-data'], name, { type: 'audio/wav' });

describe('useAudioTranscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useAudioTranscription());

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.fileName).toBe('');
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.transcribedText).toBe('');
  });

  it('should transition to uploading on startUpload', () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: xhrMock,
    });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    expect(result.current.state.phase).toBe('uploading');
    expect(result.current.state.fileName).toBe('test.wav');
    expect(mockUploadMediaFile).toHaveBeenCalledWith(
      expect.stringContaining('namespace=test-ns'),
      file,
      'audio',
      expect.any(Function),
    );
  });

  it('should transition to transcribing after upload success', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('transcribing');
    });

    expect(mockTranscribeAudio).toHaveBeenCalledWith(
      expect.stringContaining('namespace=test-ns'),
      'file-123',
      'whisper-model',
      expect.any(AbortSignal),
    );
  });

  it('should transition to complete after successful transcription', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockResolvedValue({ text: 'Hello world' });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('complete');
    });

    expect(result.current.state.transcribedText).toBe('Hello world');
  });

  it('should transition to error on upload failure', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.reject(new Error('Network error during upload')),
      xhr: xhrMock,
    });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('error');
    });

    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.title).toBe('Audio transcription failed');
    expect(result.current.state.error?.description).toBe('Network error during upload');
    expect(result.current.state.error?.variant).toBe('danger');
  });

  it('should transition to error on transcription failure', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockRejectedValue(new Error('ASR model unavailable'));

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('error');
    });

    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.title).toBe('Audio transcription failed');
    expect(result.current.state.error?.description).toBe('ASR model unavailable');
  });

  it('should handle structured ApiError from transcription', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    const apiError = {
      error: {
        component: 'asr' as const,
        code: 'no_speech',
        message: 'No speech detected — try a clearer recording',
        retriable: false,
      },
    };
    mockTranscribeAudio.mockRejectedValue(apiError);

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile('interview.wav');

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('error');
    });

    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.title).toBe('No speech detected');
    expect(result.current.state.error?.description).toContain('No speech was found');
    expect(result.current.state.error?.isRetriable).toBe(false);
  });

  it('should handle empty transcription result', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockResolvedValue({ text: '   ' });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile('silence.wav');

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('error');
    });

    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.title).toBe('No speech detected');
    expect(result.current.state.error?.description).toContain('silence.wav');
  });

  it('should timeout after AUDIO_TRANSCRIPTION_TIMEOUT_MS', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('transcribing');
    });

    act(() => {
      jest.advanceTimersByTime(105_000);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.title).toBe('Transcription timed out');
    expect(result.current.state.error?.isRetriable).toBe(true);
  });

  it('should abort on explicit abort call', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: xhrMock,
    });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    expect(result.current.state.phase).toBe('uploading');

    act(() => {
      result.current.abort();
    });

    expect(result.current.state.phase).toBe('idle');
    expect(xhrMock.abort).toHaveBeenCalled();
  });

  it('should reset state', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: xhrMock,
    });
    mockTranscribeAudio.mockResolvedValue({ text: 'Hello' });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('complete');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.transcribedText).toBe('');
  });

  it('should ignore stale upload responses when a new upload starts', async () => {
    const xhrMock1 = { abort: jest.fn() } as unknown as XMLHttpRequest;
    const xhrMock2 = { abort: jest.fn() } as unknown as XMLHttpRequest;

    let resolveFirst: (value: { data: { id: string } }) => void;
    const firstUploadPromise = new Promise<{ data: { id: string } }>((resolve) => {
      resolveFirst = resolve;
    });

    mockUploadMediaFile
      .mockReturnValueOnce({ promise: firstUploadPromise, xhr: xhrMock1 })
      .mockReturnValueOnce({
        promise: Promise.resolve({ data: { id: 'file-456' } }),
        xhr: xhrMock2,
      });
    mockTranscribeAudio.mockResolvedValue({ text: 'Second recording' });

    const { result } = renderHook(() => useAudioTranscription());

    act(() => {
      result.current.startUpload(createMockFile('first.wav'), 'model', 'ns');
    });

    act(() => {
      result.current.startUpload(createMockFile('second.wav'), 'model', 'ns');
    });

    expect(xhrMock1.abort).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.state.phase).toBe('complete');
    });

    expect(result.current.state.transcribedText).toBe('Second recording');

    // Late resolution of first upload should not affect state
    resolveFirst!({ data: { id: 'file-old' } });
    await waitFor(() => {
      expect(result.current.state.transcribedText).toBe('Second recording');
    });
  });

  it('should not transition to error on upload abort', async () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: Promise.reject(new Error('Upload aborted')),
      xhr: xhrMock,
    });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    // Should stay in uploading briefly, then cleanup silently
    await waitFor(() => {
      expect(result.current.state.phase).not.toBe('error');
    });
  });

  it('should track upload progress', () => {
    let progressCallback: ((percent: number) => void) | undefined;
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockImplementation((_url, _file, _type, onProgress) => {
      progressCallback = onProgress;
      return {
        promise: new Promise(() => {
          /* never resolves */
        }),
        xhr: xhrMock,
      };
    });

    const { result } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    act(() => {
      progressCallback?.(50);
    });

    expect(result.current.state.uploadProgress).toBe(50);
  });

  it('should cleanup on unmount', () => {
    const xhrMock = { abort: jest.fn() } as unknown as XMLHttpRequest;
    mockUploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: xhrMock,
    });

    const { result, unmount } = renderHook(() => useAudioTranscription());
    const file = createMockFile();

    act(() => {
      result.current.startUpload(file, 'whisper-model', 'test-ns');
    });

    unmount();
    expect(xhrMock.abort).toHaveBeenCalled();
  });
});
