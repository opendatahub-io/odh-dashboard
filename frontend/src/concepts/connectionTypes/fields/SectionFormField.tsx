import * as React from 'react';
import { SectionField } from '#~/concepts/connectionTypes/types';
import FormSection from '#~/components/pf-overrides/FormSection';

type Props = {
  field: SectionField;
  children?: React.ReactNode;
  'data-testid'?: string;
};

const SectionFormField: React.FC<Props> = ({
  field: { name, description },
  children,
  'data-testid': dataTestId,
}) => (
  <FormSection title={name} description={description} data-testid={dataTestId}>
    {children}
  </FormSection>
);

export default SectionFormField;
