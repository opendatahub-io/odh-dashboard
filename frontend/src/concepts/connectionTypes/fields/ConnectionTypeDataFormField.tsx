import * as React from 'react';
import BooleanFormField from '~/concepts/connectionTypes/fields/BooleanFormField';
import DropdownFormField from '~/concepts/connectionTypes/fields/DropdownFormField';
import FileFormField from '~/concepts/connectionTypes/fields/FileFormField';
import HiddenFormField from '~/concepts/connectionTypes/fields/HiddenFormField';
import NumericFormField from '~/concepts/connectionTypes/fields/NumericFormField';
import TextFormField from '~/concepts/connectionTypes/fields/TextFormField';
import ShortTextFormField from '~/concepts/connectionTypes/fields/ShortTextFormField';
import UriFormField from '~/concepts/connectionTypes/fields/UriFormField';
import { ConnectionTypeDataField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';

type Props<T extends ConnectionTypeDataField> = {
  field: T;
  isPreview?: boolean;
  onChange?: (field: T, value: unknown) => void;
  value?: T['properties']['defaultValue'];
};

const ConnectionTypeDataFormField = <T extends ConnectionTypeDataField>({
  field,
  isPreview,
  onChange,
  value,
}: Props<T>): React.ReactNode => {
  const commonProps = {
    isPreview,
    onChange: onChange ? (v: unknown) => onChange(field, v) : undefined,
    // even though the value is the type of the field default value, typescript cannot determine this here
    // or when applied to the element itself within the switch statement
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
    value: value as any,
  };
  switch (field.type) {
    case ConnectionTypeFieldType.ShortText:
      return <ShortTextFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.Text:
      return <TextFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.URI:
      return <UriFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.Hidden:
      return <HiddenFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.File:
      return <FileFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.Boolean:
      return <BooleanFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.Numeric:
      return <NumericFormField {...commonProps} field={field} />;

    case ConnectionTypeFieldType.Dropdown:
      return <DropdownFormField {...commonProps} field={field} />;
  }
  return null;
};

export default ConnectionTypeDataFormField;
