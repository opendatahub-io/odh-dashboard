import { FetchState } from 'mod-arch-core';
import { CatalogModelArtifactList } from '~/app/modelCatalogTypes';
export declare const useCatalogModelArtifacts: (sourceId: string, modelName: string) => FetchState<CatalogModelArtifactList>;
