import { APIOptions } from '~/shared/api/types';
import { ModelRegistry } from '~/app/types';
export declare const getListModelRegistries: (hostPath: string) => (opts: APIOptions) => Promise<ModelRegistry[]>;
