import * as React from 'react';
import { Select, MenuToggleProps } from '@patternfly/react-core';
import './SimpleSelect.scss';
export type SimpleSelectOption = {
    key: string;
    label: string;
    description?: React.ReactNode;
    dropdownLabel?: React.ReactNode;
    isPlaceholder?: boolean;
    isDisabled?: boolean;
    isFavorited?: boolean;
    dataTestId?: string;
    optionKey?: string;
};
export type SimpleGroupSelectOption = {
    key: string;
    label: string;
    options: SimpleSelectOption[];
};
type SimpleSelectProps = {
    options?: SimpleSelectOption[];
    groupedOptions?: SimpleGroupSelectOption[];
    value?: string;
    toggleLabel?: React.ReactNode;
    placeholder?: string;
    onChange: (key: string, isPlaceholder: boolean) => void;
    isFullWidth?: boolean;
    toggleProps?: MenuToggleProps;
    isDisabled?: boolean;
    icon?: React.ReactNode;
    dataTestId?: string;
    previewDescription?: boolean;
    isSkeleton?: boolean;
} & Omit<React.ComponentProps<typeof Select>, 'isOpen' | 'toggle' | 'dropdownItems' | 'onChange' | 'selected'>;
declare const SimpleSelect: React.FC<SimpleSelectProps>;
export default SimpleSelect;
