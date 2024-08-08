import * as React from 'react';
import { SectionField } from '~/concepts/connectionTypes/types';
import FormSection from '~/components/pf-overrides/FormSection';

type Props = {
  field: SectionField;
  children?: React.ReactNode;
};

const SectionFormField: React.FC<Props> = ({ field: { name, description }, children }) => (
  <FormSection title={name} description={description}>
    {children}
  </FormSection>
);

export default SectionFormField;
