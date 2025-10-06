import { getCatalogModelDetailsRoute } from '~/app/routes/modelCatalog/catalogModelDetails';

export const modelCatalogUrl = (sourceId?: string): string =>
  `/ai-hub/catalog${sourceId ? `/${sourceId}` : ''}`;

export const catalogModelDetailsFromModel = (catalogModelName = '', sourceId = ''): string =>
  getCatalogModelDetailsRoute({ sourceId, modelName: catalogModelName });
