import { APIOptions } from '~/shared/api/types';
import { ModelRegistryBody } from '~/app/types';
export declare const mergeRequestInit: (opts?: APIOptions, specificOpts?: RequestInit) => RequestInit;
export declare const restGET: <T>(host: string, path: string, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
/** Standard POST */
export declare const restCREATE: <T>(host: string, path: string, data: Record<string, unknown>, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
/** POST -- but with file content instead of body data */
export declare const restFILE: <T>(host: string, path: string, fileContents: string, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
/** POST -- but no body data -- targets simple endpoints */
export declare const restENDPOINT: <T>(host: string, path: string, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
export declare const restUPDATE: <T>(host: string, path: string, data: Record<string, unknown>, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
export declare const restPATCH: <T>(host: string, path: string, data: Record<string, unknown>, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
export declare const restDELETE: <T>(host: string, path: string, data: Record<string, unknown>, queryParams?: Record<string, unknown>, options?: APIOptions) => Promise<T>;
export declare const isModelRegistryResponse: <T>(response: unknown) => response is ModelRegistryBody<T>;
export declare const assembleModelRegistryBody: <T>(data: T) => ModelRegistryBody<T>;
