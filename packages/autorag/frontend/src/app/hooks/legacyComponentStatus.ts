/* eslint-disable camelcase */
import * as z from 'zod';
import { capPatternSelectionSteps } from '~/app/topology/stageMapConstants';
import {
  normalizeComponentStageStatus,
  type NormalizedComponentStatusFile,
} from './componentStatusSchema';

const LEGACY_COMPONENT_STAGE_STATUSES = ['completed', 'started', 'failed', 'skipped'] as const;

const normalizeLegacyComponentStageStatus = (value: unknown) => {
  const normalized = normalizeComponentStageStatus(value);
  return normalized === 'running' ? undefined : normalized;
};

const LegacyComponentStatusStageSchema = z
  .object({
    id: z.string(),
    description: z.string().optional(),
    steps: z.preprocess(
      (value) => (Array.isArray(value) ? capPatternSelectionSteps(value) : value),
      z.array(z.string()).optional(),
    ),
    selected_patterns: z.preprocess(
      // eslint-disable-line camelcase
      (value) => {
        if (!Array.isArray(value)) {
          return undefined;
        }
        const strings = value.filter((item): item is string => typeof item === 'string');
        return strings.length > 0 || value.length === 0 ? strings : undefined;
      },
      z.array(z.string()).optional(),
    ),
    status: z.preprocess(
      normalizeLegacyComponentStageStatus,
      z.enum(LEGACY_COMPONENT_STAGE_STATUSES).optional(),
    ),
    timestamp: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    outputs: z.record(z.string(), z.unknown()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

const LegacyComponentStatusFileSchema = z
  .object({
    component_id: z.string(), // eslint-disable-line camelcase
    started_at: z.string().optional(), // eslint-disable-line camelcase
    completed_at: z.string().optional(), // eslint-disable-line camelcase
    stages: z.array(LegacyComponentStatusStageSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

export type LegacyComponentStatusFile = z.infer<typeof LegacyComponentStatusFileSchema>;

export function normalizeLegacyComponentStatus(
  raw: LegacyComponentStatusFile,
): NormalizedComponentStatusFile {
  return {
    component_id: raw.component_id,
    started_at: raw.started_at,
    completed_at: raw.completed_at,
    metadata: raw.metadata,
    stages: raw.stages.map((stage) => ({ ...stage })),
  };
}

export function parseLegacyComponentStatus(value: unknown): NormalizedComponentStatusFile {
  return normalizeLegacyComponentStatus(LegacyComponentStatusFileSchema.parse(value));
}

/* eslint-enable camelcase */
