import { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { catalogModelMock } from '~/concepts/modelCatalog/mockData/catalogModelMock';

export const mockModelCatalogSource = ({
  models = [catalogModelMock({})],
}: Partial<ModelCatalogSource>): ModelCatalogSource => ({
  source: 'Red Hat',
  models,
});
