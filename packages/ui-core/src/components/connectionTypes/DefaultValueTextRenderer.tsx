import * as React from 'react';
import type { ConnectionTypeDataField, FieldMode } from '@odh-dashboard/k8s-core';
import { defaultValueToString } from '@odh-dashboard/k8s-core';
import FormGroupText from './FormGroupText';
import UnspecifiedValue from './UnspecifiedValue';

type Props = {
  id: string;
  field: ConnectionTypeDataField;
  mode?: FieldMode;
  children: React.ReactNode;
  component?: 'div' | 'pre';
};

const DefaultValueTextRenderer: React.FC<Props> = ({ id, field, mode, children, component }) =>
  mode !== 'default' && field.properties.defaultReadOnly ? (
    <FormGroupText id={id} component={component}>
      {defaultValueToString(field) ?? (mode === 'preview' ? <UnspecifiedValue /> : '-')}
    </FormGroupText>
  ) : (
    children
  );

export default DefaultValueTextRenderer;
