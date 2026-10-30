import { APIOptions, FetchState } from 'mod-arch-core';
export declare const useSourceConfigById: <TConfig>(apiAvailable: boolean, getSourceConfig: (opts: APIOptions, sourceId: string) => Promise<TConfig>, sourceId: string) => FetchState<TConfig | null>;
