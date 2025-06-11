import * as React from 'react';
import FormGroupText from '#~/components/FormGroupText';
import { FieldMode } from '#~/concepts/connectionTypes/fields/types';
import UnspecifiedValue from '#~/concepts/connectionTypes/fields/UnspecifiedValue';
import { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';
import { defaultValueToString } from '#~/concepts/connectionTypes/utils';

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
