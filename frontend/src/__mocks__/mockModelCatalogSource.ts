import { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { mockCatalogModel } from './mockCatalogModel';

export const mockModelCatalogSource = ({
  source = 'Red Hat',
  models = [mockCatalogModel({})],
}: Partial<ModelCatalogSource>): ModelCatalogSource => ({
  source,
  models,
});
