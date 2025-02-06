// This file is a workaround for webpack module parse error and will remove it as a part of RHOAIENG-18959
import { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { catalogModelMock } from './catalogModelMock';

export const modelCatalogSourceMock = ({
  models = [catalogModelMock({})],
}: Partial<ModelCatalogSource>): ModelCatalogSource => ({
  source: 'Red Hat',
  models,
});
