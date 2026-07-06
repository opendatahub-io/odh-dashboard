import { UseCaseOptionValue } from '~/concepts/modelCatalog/const';
export type UseCaseOption = {
    value: UseCaseOptionValue;
    label: string;
    description: string;
    inputTokens: number;
    outputTokens: number;
};
export declare const USE_CASE_OPTIONS: UseCaseOption[];
/**
 * Utility function to get use case option by value
 */
export declare const getUseCaseOption: (useCase: UseCaseOptionValue | string) => UseCaseOption | undefined;
/**
 * Type guard to check if a string is a valid UseCaseOptionValue
 */
export declare const isUseCaseOptionValue: (value: string) => value is UseCaseOptionValue;
/**
 * Get display label for a use case value including token information.
 * Format: "Label (inputTokens input | outputTokens output tokens)"
 */
export declare const getUseCaseDisplayLabel: (value: string) => string;
/**
 * Mapping from UseCaseOptionValue to display name for use in filters
 */
export declare const USE_CASE_NAME_MAPPING: Record<UseCaseOptionValue, string>;
