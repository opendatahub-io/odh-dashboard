import type { SourceMode } from '~/app/types';
export declare const isValidUrl: (url: string) => boolean;
export declare const getUrlValidationError: (url: string) => string | undefined;
export declare const getUserFriendlyConnectionError: (errorCode: string | undefined, sourceMode: SourceMode) => string;
