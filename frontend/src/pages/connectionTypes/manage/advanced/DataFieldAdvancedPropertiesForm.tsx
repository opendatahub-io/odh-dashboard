import * as React from 'react';
import { ConnectionTypeDataField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import BooleanAdvancedPropertiesForm from '~/pages/connectionTypes/manage/advanced/BooleanAdvancedPropertiesForm';
import { AdvancedFieldProps } from '~/pages/connectionTypes/manage/advanced/types';
import NumericAdvancedPropertiesForm from '~/pages/connectionTypes/manage/advanced/NumericAdvancedPropertiesForm';

const CustomFieldPropertiesForm = <T extends ConnectionTypeDataField>(
  props: AdvancedFieldProps<T>,
): React.ReactNode => {
  const Component = (() => {
    // TODO define advanced forms
    switch (props.field.type) {
      case ConnectionTypeFieldType.File:
        return () => null;

      case ConnectionTypeFieldType.Boolean:
        return BooleanAdvancedPropertiesForm;

      case ConnectionTypeFieldType.Numeric:
        return NumericAdvancedPropertiesForm;

      case ConnectionTypeFieldType.Dropdown:
        return () => null;
    }
    return undefined;
  })();

  return Component ? (
    <Component
      // delegate all props to the component
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  ) : undefined;
};

export default CustomFieldPropertiesForm;
