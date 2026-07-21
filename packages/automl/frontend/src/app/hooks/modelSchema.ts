/**
 * Zod schemas to validate AutomlModel shape from model.json files.
 *
 * Three schemas cover the evolution of the model.json format:
 *   - 3.4 Tabular:     location.notebook (singular, file path), no location.metrics
 *   - 3.4 Timeseries:  location.notebooks (plural, directory), location.metrics, base_model
 *   - 3.5 Unified:     location.notebook (file path), location.metrics, no base_model
 *
 * model_directory is optional in the raw file since it gets rewritten after parsing.
 */
/* eslint-disable camelcase */
import * as z from 'zod';

const AutomlModelBaseSchema = z.object({
  name: z.string(),
  location: z.object({
    model_directory: z.string().optional(),
    predictor: z.string(),
  }),
  metrics: z.object({
    test_data: z.record(z.string(), z.number()),
  }),
});

// Legacy tabular schema (pre-3.5): notebook singular, no metrics in location
const AutomlTabularModelSchemaV34 = AutomlModelBaseSchema.extend({
  location: AutomlModelBaseSchema.shape.location.extend({
    notebook: z.string(),
  }),
});

// Legacy timeseries schema (pre-3.5): notebooks plural (directory), base_model, metrics in location
const AutomlTimeseriesModelSchemaV34 = AutomlModelBaseSchema.extend({
  base_model: z.string(),
  location: AutomlModelBaseSchema.shape.location.extend({
    notebooks: z.string(),
    metrics: z.string(),
  }),
});

// Unified schema (3.5+): notebook singular (file path), metrics in location, no base_model
const AutomlModelSchemaV35 = AutomlModelBaseSchema.extend({
  location: AutomlModelBaseSchema.shape.location.extend({
    notebook: z.string(),
    metrics: z.string(),
    back_testing: z.string().optional(), // added in 3.5 EA2
  }),
});

// Try 3.5 first, then fall back to legacy schemas for backwards compatibility.
export const AutomlModelSchema = z.union([
  AutomlModelSchemaV35,
  AutomlTimeseriesModelSchemaV34,
  AutomlTabularModelSchemaV34,
]);

export type AutomlRawTabularModelV34 = z.infer<typeof AutomlTabularModelSchemaV34>;
export type AutomlRawTimeseriesModelV34 = z.infer<typeof AutomlTimeseriesModelSchemaV34>;
export type AutomlRawModelV35 = z.infer<typeof AutomlModelSchemaV35>;
export type AutomlRawModel =
  | AutomlRawModelV35
  | AutomlRawTabularModelV34
  | AutomlRawTimeseriesModelV34;

export const isRawTimeseriesModelV34 = (
  model: AutomlRawModel,
): model is AutomlRawTimeseriesModelV34 => 'notebooks' in model.location;

export const isRawModelV35 = (model: AutomlRawModel): model is AutomlRawModelV35 =>
  'notebook' in model.location && 'metrics' in model.location && !('base_model' in model);
/* eslint-enable camelcase */
