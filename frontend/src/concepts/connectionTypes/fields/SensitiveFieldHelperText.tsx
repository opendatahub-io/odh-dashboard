import * as React from 'react';
import { FormHelperText, HelperText, HelperTextItem, Icon } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import type { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';
import type { FieldMode } from '#~/concepts/connectionTypes/fields/types';

const getHelperText = (field: ConnectionTypeDataField, mode?: FieldMode): string | null => {
  if (mode === 'default') {
    return null;
  }
  if ('helperText' in field.properties && field.properties.helperText) {
    return field.properties.helperText;
  }
  if (field.properties.deferInput) {
    return 'Be cautious when sharing sensitive information. Secret details are visible to users with access to the project.';
  }
  return null;
};

type Props = {
  field: ConnectionTypeDataField;
  mode?: FieldMode;
};

export const SensitiveFieldHelperText: React.FC<Props> = ({ field, mode }) => {
  const helperText = getHelperText(field, mode);

  if (!helperText) {
    return null;
  }

  return (
    <FormHelperText>
      <HelperText>
        <HelperTextItem
          variant="success"
          icon={
            <Icon status="info">
              <InfoCircleIcon />
            </Icon>
          }
        >
          {helperText}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  );
};
