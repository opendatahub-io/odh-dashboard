import { UseCaseOptionValue } from '~/concepts/modelCatalog/const';
export type UseCaseOption = {
    value: UseCaseOptionValue;
    label: string;
    description: string;
};
export declare const USE_CASE_OPTIONS: UseCaseOption[];
/**
 * Utility function to get use case option by value
 */
export declare const getUseCaseOption: (useCase: UseCaseOptionValue) => UseCaseOption | undefined;
