import { FetchState } from 'mod-arch-core';
import { CatalogArtifactList } from '~/app/modelCatalogTypes';
export declare const useCatalogModelArtifacts: (sourceId: string, modelName: string, isValidated?: boolean, onlyFetchIfValidated?: boolean) => FetchState<CatalogArtifactList>;
