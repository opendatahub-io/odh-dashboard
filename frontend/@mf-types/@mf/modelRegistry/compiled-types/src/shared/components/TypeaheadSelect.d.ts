import React from 'react';
import { SelectOptionProps, MenuToggleProps, SelectProps } from '@patternfly/react-core';
export interface TypeaheadSelectOption extends Omit<SelectOptionProps, 'content' | 'isSelected'> {
    /** Content of the select option. */
    content: string | number;
    /** Value of the select option. */
    value: string | number;
    /** Indicator for option being selected */
    isSelected?: boolean;
}
export interface TypeaheadSelectProps extends Omit<SelectProps, 'toggle' | 'onSelect'> {
    /** Options of the select */
    selectOptions: TypeaheadSelectOption[];
    /** Callback triggered on selection. */
    onSelect?: (_event: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<HTMLInputElement> | undefined, selection: string | number) => void;
    /** Callback triggered when the select opens or closes. */
    onToggle?: (nextIsOpen: boolean) => void;
    /** Callback triggered when the text in the input field changes. */
    onInputChange?: (newValue: string) => void;
    /** Function to return items matching the current filter value */
    filterFunction?: (filterValue: string, options: TypeaheadSelectOption[]) => TypeaheadSelectOption[];
    /** Callback triggered when the clear button is selected */
    onClearSelection?: () => void;
    /** Flag to allow clear current selection */
    allowClear?: boolean;
    /** Placeholder text for the select input. */
    placeholder?: string;
    /** Flag to indicate if the typeahead select allows new items */
    isCreatable?: boolean;
    /** Flag to indicate if create option should be at top of typeahead */
    isCreateOptionOnTop?: boolean;
    /** Message to display to create a new option */
    createOptionMessage?: string | ((newValue: string) => string);
    /** Message to display when no options are available. */
    noOptionsAvailableMessage?: string;
    /** Message to display when no options match the filter. */
    noOptionsFoundMessage?: string | ((filter: string) => string);
    /** Flag indicating the select should be disabled. */
    isDisabled?: boolean;
    /** Width of the toggle. */
    toggleWidth?: string;
    /** Additional props passed to the toggle. */
    toggleProps?: MenuToggleProps;
    /** Flag to indicate if the selection is required or not */
    isRequired?: boolean;
    /** Test id of the toggle */
    dataTestId?: string;
    /** Flag to indicate if showing the description under the toggle */
    previewDescription?: boolean;
}
declare const TypeaheadSelect: React.FunctionComponent<TypeaheadSelectProps>;
export default TypeaheadSelect;
