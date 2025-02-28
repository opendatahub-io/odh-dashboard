import { APIOptions } from '~/shared/api/types';
import { ModelRegistry } from '~/app/types';
import { Namespace, UserSettings } from '~/shared/types';
export declare const getListModelRegistries: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<ModelRegistry[]>;
export declare const getUser: (hostPath: string) => (opts: APIOptions) => Promise<UserSettings>;
export declare const getNamespaces: (hostPath: string) => (opts: APIOptions) => Promise<Namespace[]>;
