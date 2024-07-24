import { HelperText, HelperTextItem, HelperTextItemProps, Icon } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import React from 'react';

interface DuplicateNameHelperTextProps {
  name: string;
  isError?: boolean;
}

export const DuplicateNameHelperText: React.FC<DuplicateNameHelperTextProps> = ({
  name,
  isError,
}) => {
  const helperTextItemProps: HelperTextItemProps = isError
    ? { variant: 'error', hasIcon: true }
    : {
        icon: (
          <Icon status="info">
            <InfoCircleIcon />
          </Icon>
        ),
      };

  return (
    <HelperText data-testid="duplicate-name-help-text">
      <HelperTextItem {...helperTextItemProps}>
        <b>{name}</b> already exists. Try a different name.
      </HelperTextItem>
    </HelperText>
  );
};
