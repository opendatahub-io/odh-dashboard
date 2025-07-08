import * as React from 'react';
import { SearchInputProps } from '@patternfly/react-core';
type ThemeAwareSearchInputProps = Omit<SearchInputProps, 'onChange' | 'onClear'> & {
    onChange: (value: string) => void;
    onClear?: () => void;
    fieldLabel?: string;
    'data-testid'?: string;
};
declare const ThemeAwareSearchInput: React.FC<ThemeAwareSearchInputProps>;
export default ThemeAwareSearchInput;
