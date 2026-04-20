import type { ModelDetailsTab } from '~/concepts/modelCatalog/const';

/**
 * Test-only route utilities for model catalog pages.
 *
 * These mirror the functions in ~/app/routes/modelCatalog/catalogModel.ts
 * but avoid importing modelCatalogUtils / ModelCatalogContext which pull in
 * ~/app/utilities/const.ts and its process.env references (unavailable in the
 * Cypress test webpack context).
 *
 * Keep these in sync when the midstream routes change.
 */

const encodeParam = (value: string): string => encodeURIComponent(value).replace(/\./g, '%252E');

export const modelCatalogUrl = (sourceId?: string): string =>
  `/ai-hub/models/catalog${sourceId ? `/${encodeParam(sourceId)}` : ''}`;

export const catalogModelDetailsUrl = (modelName = '', sourceId = ''): string =>
  `${modelCatalogUrl(sourceId)}/${encodeParam(modelName)}`;

export const catalogModelDetailsTabUrl = (
  tab: ModelDetailsTab,
  modelName = '',
  sourceId = '',
): string => `${catalogModelDetailsUrl(modelName, sourceId)}/${encodeURIComponent(tab)}`;
