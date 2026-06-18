import * as React from 'react';
import { uploadMediaFile, transcribeAudio } from '~/app/services/llamaStackService';
import { AUDIO_TRANSCRIPTION_TIMEOUT_MS } from '~/app/Chatbot/const';
import { URL_PREFIX } from '~/app/utilities';
import { classifyError } from '~/app/utilities/errorClassifier';
import { ClassifiedError, isApiError } from '~/app/types';

export type AudioTranscriptionPhase = 'idle' | 'uploading' | 'transcribing' | 'complete' | 'error';

export interface AudioTranscriptionState {
  phase: AudioTranscriptionPhase;
  fileName: string;
  uploadProgress: number;
  error: ClassifiedError | null;
  transcribedText: string;
}

const INITIAL_STATE: AudioTranscriptionState = {
  phase: 'idle',
  fileName: '',
  uploadProgress: 0,
  error: null,
  transcribedText: '',
};

interface UseAudioTranscriptionReturn {
  state: AudioTranscriptionState;
  startUpload: (file: File, asrModelId: string, namespace: string) => void;
  abort: () => void;
  reset: () => void;
}

export const useAudioTranscription = (): UseAudioTranscriptionReturn => {
  const [state, setState] = React.useState<AudioTranscriptionState>(INITIAL_STATE);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);
  const uploadGenRef = React.useRef(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  const abort = React.useCallback(() => {
    cleanup();
    uploadGenRef.current += 1;
    setState(INITIAL_STATE);
  }, [cleanup]);

  const reset = React.useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const startUpload = React.useCallback(
    (file: File, asrModelId: string, namespace: string) => {
      cleanup();
      uploadGenRef.current += 1;
      const gen = uploadGenRef.current;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        phase: 'uploading',
        fileName: file.name,
        uploadProgress: 0,
        error: null,
        transcribedText: '',
      });

      const url = `${URL_PREFIX}/api/v1/lsd/files/media?namespace=${encodeURIComponent(namespace)}`;
      const { promise, xhr } = uploadMediaFile(url, file, 'audio', (percent) => {
        if (uploadGenRef.current === gen) {
          setState((prev) => ({ ...prev, uploadProgress: percent }));
        }
      });
      xhrRef.current = xhr;

      promise
        .then((response) => {
          if (uploadGenRef.current !== gen) {
            return;
          }
          xhrRef.current = null;

          setState((prev) => ({ ...prev, phase: 'transcribing', uploadProgress: 100 }));

          timeoutRef.current = setTimeout(() => {
            if (uploadGenRef.current === gen) {
              controller.abort();
              setState((prev) => ({
                ...prev,
                phase: 'error',
                error: {
                  pattern: 'full-failure',
                  variant: 'danger',
                  title: 'Transcription timed out',
                  description:
                    'The transcription took too long. The audio file may be too large or the model is overloaded.',
                  details: {
                    component: 'Audio Transcription',
                    errorCode: 'timeout',
                    rawMessage: 'Client-side timeout exceeded',
                  },
                  isRetriable: true,
                },
              }));
            }
          }, AUDIO_TRANSCRIPTION_TIMEOUT_MS);

          const transcribeUrl = `${URL_PREFIX}/api/v1/lsd/audio/transcriptions?namespace=${encodeURIComponent(namespace)}`;
          return transcribeAudio(transcribeUrl, response.data.id, asrModelId, controller.signal);
        })
        .then((result) => {
          if (uploadGenRef.current !== gen || !result) {
            return;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          if (!result.text || !result.text.trim()) {
            setState((prev) => ({
              ...prev,
              phase: 'error',
              error: {
                pattern: 'full-failure',
                variant: 'danger',
                title: 'No speech detected',
                description: `No speech was found in ${file.name}. Try a clearer recording.`,
                details: {
                  component: 'Audio Transcription',
                  errorCode: 'no_speech',
                  rawMessage: 'Empty transcription result',
                },
                isRetriable: false,
              },
            }));
            return;
          }

          setState((prev) => ({
            ...prev,
            phase: 'complete',
            transcribedText: result.text,
          }));
        })
        .catch((error: unknown) => {
          if (uploadGenRef.current !== gen) {
            return;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          if (error instanceof Error && error.message === 'Upload aborted') {
            return;
          }

          let classified: ClassifiedError;
          if (isApiError(error)) {
            classified = classifyError(error);
          } else {
            const rawMessage =
              error instanceof Error ? error.message : 'An unexpected error occurred.';
            classified = {
              pattern: 'full-failure',
              variant: 'danger',
              title: 'Audio transcription failed',
              description: rawMessage,
              details: {
                component: 'Audio Transcription',
                errorCode: 'UNKNOWN',
                rawMessage,
              },
              isRetriable: false,
            };
          }

          setState((prev) => ({
            ...prev,
            phase: 'error',
            error: classified,
          }));
        });
    },
    [cleanup],
  );

  return React.useMemo(
    () => ({ state, startUpload, abort, reset }),
    [state, startUpload, abort, reset],
  );
};
