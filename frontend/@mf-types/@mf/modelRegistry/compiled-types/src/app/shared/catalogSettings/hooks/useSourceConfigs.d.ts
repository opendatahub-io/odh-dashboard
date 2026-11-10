import { APIOptions, FetchState } from 'mod-arch-core';
export declare const useSourceConfigs: <TConfigList>(apiAvailable: boolean, getSourceConfigs: (opts: APIOptions) => Promise<TConfigList>, initialValue: TConfigList) => FetchState<TConfigList>;
