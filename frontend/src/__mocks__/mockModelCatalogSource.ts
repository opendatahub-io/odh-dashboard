import { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { mockCatalogModel } from './mockCatalogModel';

export const mockModelCatalogSource = ({
  models = [mockCatalogModel({})],
}: Partial<ModelCatalogSource>): ModelCatalogSource => ({
  source: 'Red Hat',
  models,
});
