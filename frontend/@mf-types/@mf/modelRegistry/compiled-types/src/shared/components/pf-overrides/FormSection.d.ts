import * as React from 'react';
import { FormSectionProps } from '@patternfly/react-core';
import './FormSection.scss';
type Props = FormSectionProps & {
    description?: React.ReactNode;
};
declare const FormSection: React.FC<Props>;
export default FormSection;
