import { TrackingOutcome } from '@odh-dashboard/ui-core';

export const PLAYGROUND_MULTIMODAL_EVENTS = {
  IMAGE_UPLOAD_SELECTED: 'Playground Image Upload Selected',
  IMAGE_UPLOAD_COMPLETED: 'Playground Image Upload Completed',
  IMAGE_UPLOAD_REMOVED: 'Playground Image Upload Removed',
  AUDIO_UPLOAD_SELECTED: 'Playground Audio Upload Selected',
  AUDIO_UPLOAD_COMPLETED: 'Playground Audio Upload Completed',
  AUDIO_UPLOAD_REMOVED: 'Playground Audio Upload Removed',
  AUDIO_TRANSCRIPTION_STARTED: 'Playground Audio Transcription Started',
  AUDIO_TRANSCRIPTION_COMPLETED: 'Playground Audio Transcription Completed',
  ASR_MODEL_SELECTED: 'Playground ASR Model Selected',
} as const;

export type ImageUploadSelectedProperties = {
  configID: number;
  compareMode: boolean;
};

export type ImageUploadCompletedProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  fileType?: string;
  fileSizeBytes?: number;
  error?: string;
};

export type ImageUploadRemovedProperties = {
  configID: number;
  compareMode: boolean;
};

export type AudioUploadSelectedProperties = {
  configID: number;
  compareMode: boolean;
};

export type AudioUploadCompletedProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  fileType?: string;
  fileSizeBytes?: number;
  error?: string;
};

export type AudioUploadRemovedProperties = {
  configID: number;
  compareMode: boolean;
  phase: string;
};

export type AudioTranscriptionStartedProperties = {
  configID: number;
  modelName: string;
};

export type AudioTranscriptionCompletedProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  modelName: string;
  durationMs?: number;
  error?: string;
};

export type AsrModelSelectedProperties = {
  modelName: string;
  isDefaultModel: boolean;
};

export type Modality = 'text' | 'image' | 'audio' | 'imageaudio';
