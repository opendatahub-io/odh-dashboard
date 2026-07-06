import React from 'react';
import { Alert, AlertProps, Flex, FlexItem, Icon, Popover, Tooltip } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

interface CorruptedMetadataAlertProps extends Pick<AlertProps, 'variant'> {
  popoverText: React.ReactNode;
  action?: React.ReactNode;
  errorText?: React.ReactNode;
}

export const CorruptedMetadataAlert: React.FC<CorruptedMetadataAlertProps> = ({
  variant = 'warning',
  action,
  errorText,
  popoverText,
}) => (
  <Flex
    alignItems={{ default: 'alignItemsCenter' }}
    spaceItems={{ default: 'spaceItemsNone' }}
    data-testid="corrupted-metadata-alert"
  >
    <FlexItem>
      <Popover aria-label="Corrupted metadata popover" bodyContent={popoverText}>
        <Alert
          variant={variant}
          isInline
          isPlain
          title="Corrupted metadata"
          className="pf-v6-u-text-nowrap"
        />
      </Popover>
    </FlexItem>

    {action && <FlexItem data-testid="corrupted-metadata-alert-action">{action}</FlexItem>}

    {errorText && (
      <FlexItem>
        <Tooltip content={errorText}>
          <Icon status="danger" data-testid="corrupted-metadata-alert-error-icon">
            <ExclamationCircleIcon />
          </Icon>
        </Tooltip>
      </FlexItem>
    )}
  </Flex>
);
