import * as React from 'react';
import BooleanFormField from '#~/concepts/connectionTypes/fields/BooleanFormField';
import DropdownFormField from '#~/concepts/connectionTypes/fields/DropdownFormField';
import FileFormField from '#~/concepts/connectionTypes/fields/FileFormField';
import HiddenFormField from '#~/concepts/connectionTypes/fields/HiddenFormField';
import NumericFormField from '#~/concepts/connectionTypes/fields/NumericFormField';
import TextFormField from '#~/concepts/connectionTypes/fields/TextFormField';
import ShortTextFormField from '#~/concepts/connectionTypes/fields/ShortTextFormField';
import UriFormField from '#~/concepts/connectionTypes/fields/UriFormField';
import {
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
} from '#~/concepts/connectionTypes/types';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';

const components = {
  [ConnectionTypeFieldType.ShortText]: ShortTextFormField,
  [ConnectionTypeFieldType.Text]: TextFormField,
  [ConnectionTypeFieldType.URI]: UriFormField,
  [ConnectionTypeFieldType.Hidden]: HiddenFormField,
  [ConnectionTypeFieldType.File]: FileFormField,
  [ConnectionTypeFieldType.Boolean]: BooleanFormField,
  [ConnectionTypeFieldType.Numeric]: NumericFormField,
  [ConnectionTypeFieldType.Dropdown]: DropdownFormField,
};

const ConnectionTypeDataFormField = <T extends ConnectionTypeDataField>(
  props: FieldProps<T>,
): React.ReactNode => {
  const Component = components[props.field.type];
  return (
    <Component
      // delegate all props to the component
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
};

export default ConnectionTypeDataFormField;
