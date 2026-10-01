/* eslint-disable camelcase */
import * as z from 'zod';

export const CANONICAL_COMPONENT_STAGE_STATES = [
  'started',
  'running',
  'completed',
  'failed',
] as const;

export const COMPONENT_STATUS_MESSAGE_LEVELS = ['info', 'warning', 'error'] as const;

const ComponentStatusMessageSchema = z
  .object({
    level: z.enum(COMPONENT_STATUS_MESSAGE_LEVELS),
    text: z.string().min(1),
  })
  .strict();

const CanonicalComponentStatusStageSchema = z
  .object({
    id: z.string(),
    status: z
      .object({
        state: z.enum(CANONICAL_COMPONENT_STAGE_STATES),
        step: z.string().optional(),
        message: ComponentStatusMessageSchema.optional(),
        running_at: z.string().optional(), // eslint-disable-line camelcase
      })
      .strict(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
  })
  .strict();

export const CanonicalComponentStatusFileSchema = z
  .object({
    component_id: z.string(), // eslint-disable-line camelcase
    started_at: z.string(), // eslint-disable-line camelcase
    completed_at: z.string().optional(), // eslint-disable-line camelcase
    metadata: z.object({ display_name: z.string().min(1) }).catchall(z.unknown()),
    stages: z.array(CanonicalComponentStatusStageSchema),
  })
  .strict();

export type CanonicalComponentStatusFile = z.infer<typeof CanonicalComponentStatusFileSchema>;

export type NormalizedComponentStageStatus =
  'completed' | 'started' | 'running' | 'failed' | 'skipped';

export type NormalizedComponentStatusStage = {
  id: string;
  description?: string;
  steps?: string[];
  selected_patterns?: string[]; // eslint-disable-line camelcase
  status?: NormalizedComponentStageStatus;
  timestamp?: string;
  step?: string;
  message?: { level: (typeof COMPONENT_STATUS_MESSAGE_LEVELS)[number]; text: string };
  running_at?: string; // eslint-disable-line camelcase
  metrics?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
};

export type NormalizedComponentStatusFile = {
  component_id: string; // eslint-disable-line camelcase
  started_at?: string; // eslint-disable-line camelcase
  completed_at?: string; // eslint-disable-line camelcase
  stages: NormalizedComponentStatusStage[];
  metadata?: Record<string, unknown>;
};

export function normalizeComponentStageStatus(
  value: unknown,
): NormalizedComponentStageStatus | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'completed' ||
    normalized === 'started' ||
    normalized === 'running' ||
    normalized === 'failed' ||
    normalized === 'skipped'
    ? normalized
    : undefined;
}

export function normalizeCanonicalComponentStatus(
  raw: CanonicalComponentStatusFile,
): NormalizedComponentStatusFile {
  return {
    component_id: raw.component_id,
    started_at: raw.started_at,
    completed_at: raw.completed_at,
    metadata: raw.metadata,
    stages: raw.stages.map((stage) => ({
      id: stage.id,
      status: stage.status.state,
      step: stage.status.step,
      message: stage.status.message,
      running_at: stage.status.running_at,
      metrics: stage.metrics,
      error: stage.error,
    })),
  };
}

/* eslint-enable camelcase */
