import * as React from 'react';
type ThemeAwareFormGroupWrapperProps = {
    children: React.ReactNode;
    label: string;
    fieldId: string;
    isRequired?: boolean;
    helperTextNode?: React.ReactNode;
    className?: string;
};
declare const ThemeAwareFormGroupWrapper: React.FC<ThemeAwareFormGroupWrapperProps>;
export default ThemeAwareFormGroupWrapper;
