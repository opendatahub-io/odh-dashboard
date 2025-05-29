import * as React from 'react';
import { EyeIcon } from '@patternfly/react-icons';
import { Button, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { HiddenField } from '#~/concepts/connectionTypes/types';
import PasswordInput from '#~/components/PasswordInput';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';
import FormGroupText from '#~/components/FormGroupText';
import UnspecifiedValue from '#~/concepts/connectionTypes/fields/UnspecifiedValue';
import { trimInputOnBlur, trimInputOnPaste } from '#~/concepts/connectionTypes/utils';

const HiddenFormField: React.FC<FieldProps<HiddenField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  return mode !== 'default' && field.properties.defaultReadOnly ? (
    <FormGroupText id={id}>
      {field.properties.defaultValue ? (
        <Flex
          display={{ default: 'inlineFlex' }}
          flexWrap={{ default: 'nowrap' }}
          gap={{ default: 'gapSm' }}
          style={{ maxWidth: '100%' }}
        >
          <FlexItem
            style={{ flexGrow: 1, flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {field.properties.defaultValue.replace(/./g, '•')}
          </FlexItem>
          <FlexItem style={{ flexShrink: 0 }}>
            <Popover bodyContent={field.properties.defaultValue}>
              <Button isInline variant="link" icon={<EyeIcon />}>
                View value
              </Button>
            </Popover>
          </FlexItem>
        </Flex>
      ) : isPreview ? (
        <UnspecifiedValue />
      ) : (
        '-'
      )}
    </FormGroupText>
  ) : (
    <PasswordInput
      aria-readonly={isPreview}
      autoComplete="off"
      isRequired={field.required}
      id={id}
      name={id}
      data-testid={dataTestId}
      ariaLabelHide="Hide value"
      ariaLabelShow="Show value"
      value={(isPreview ? field.properties.defaultValue : value) ?? ''}
      onChange={isPreview || !onChange ? undefined : (_e, v) => onChange(v)}
      onBlur={(e) => trimInputOnBlur(value, onChange)(e)}
      onPaste={(e) => trimInputOnPaste(value, onChange)(e)}
    />
  );
};

export default HiddenFormField;
