import * as React from 'react';
type ThemeAwareFormGroupWrapperProps = {
    children: React.ReactNode;
    label: string;
    fieldId: string;
    isRequired?: boolean;
    descriptionTextNode?: React.ReactNode;
    helperTextNode?: React.ReactNode;
    className?: string;
    labelHelp?: React.ReactElement;
    'data-testid'?: string;
};
declare const ThemeAwareFormGroupWrapper: React.FC<ThemeAwareFormGroupWrapperProps>;
export default ThemeAwareFormGroupWrapper;
