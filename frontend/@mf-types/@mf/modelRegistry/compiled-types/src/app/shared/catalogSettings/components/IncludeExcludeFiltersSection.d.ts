import * as React from 'react';
export type IncludeExcludeFiltersSectionTestIds = {
    section?: string;
    includedInput?: string;
    excludedInput?: string;
};
type IncludeExcludeFiltersSectionProps = {
    includedValue: string;
    onIncludedChange: (value: string) => void;
    excludedValue: string;
    onExcludedChange: (value: string) => void;
    isDefaultExpanded?: boolean;
    sectionTitle: string;
    sectionTitleId: string;
    sectionDescription: React.ReactNode;
    includedFieldId: string;
    excludedFieldId: string;
    includedLabel: string;
    excludedLabel: string;
    includedDescription: React.ReactNode;
    excludedDescription: React.ReactNode;
    includedHelperText?: React.ReactNode;
    excludedHelperText?: React.ReactNode;
    includedPlaceholder?: string;
    excludedPlaceholder?: string;
    testIds: IncludeExcludeFiltersSectionTestIds;
};
declare const IncludeExcludeFiltersSection: React.FC<IncludeExcludeFiltersSectionProps>;
export default IncludeExcludeFiltersSection;
