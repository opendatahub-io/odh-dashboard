import React, { CSSProperties, ReactNode } from 'react';
import './FormFieldset.scss';
interface FormFieldsetProps {
    component: ReactNode;
    field?: string;
    className?: string;
    fieldsetStyle?: CSSProperties;
}
declare const FormFieldset: React.FC<FormFieldsetProps>;
export default FormFieldset;
