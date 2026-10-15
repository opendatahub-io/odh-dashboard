import { FetchState } from 'mod-arch-core';
import { CatalogSourceList } from '~/app/shared/types/catalogTypes';
import type { CatalogSourcesPollingAPIState } from '~/app/shared/catalogSettings/types';
export declare const useCatalogSourcesWithPolling: (apiState: CatalogSourcesPollingAPIState) => FetchState<CatalogSourceList>;
