type CategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow';
export declare const getCategoryColor: (category?: string) => CategoryColor;
export declare const capitalizeFirst: (value: string) => string;
export declare const VISIBLE_METRICS_COUNT = 3;
export declare const toSafeExternalUrl: (raw?: string) => string | undefined;
export {};
