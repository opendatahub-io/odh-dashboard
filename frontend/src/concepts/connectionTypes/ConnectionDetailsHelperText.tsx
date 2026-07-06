import React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  HelperText,
  HelperTextItem,
  Popover,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import { Connection, ConnectionTypeConfigMapObj } from './types';
import { getConnectionTypeDisplayName, parseConnectionSecretValues } from './utils';

type Props = {
  connection?: Connection;
  connectionType?: ConnectionTypeConfigMapObj;
};

export const ConnectionDetailsHelperText: React.FC<Props> = ({ connection, connectionType }) => {
  const displayName = connection && getDisplayNameFromK8sResource(connection);
  const description = connection && getDescriptionFromK8sResource(connection);
  const connectionTypeName = connection && getConnectionTypeDisplayName(connection, connectionType);

  const connectionValues = React.useMemo(
    () => connection && parseConnectionSecretValues(connection, connectionType),
    [connection, connectionType],
  );

  return (
    <HelperText>
      <HelperTextItem>
        <Popover
          headerContent="Connection details"
          bodyContent={
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>Connection name</DescriptionListTerm>
                <DescriptionListDescription>{displayName}</DescriptionListDescription>
              </DescriptionListGroup>
              {description && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Connection description</DescriptionListTerm>
                  <DescriptionListDescription>{description}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {connectionValues && connectionValues.URI && (
                <DescriptionListGroup>
                  <DescriptionListTerm>URI</DescriptionListTerm>
                  <DescriptionListDescription>{connectionValues.URI}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Type</DescriptionListTerm>
                <DescriptionListDescription>{connectionTypeName}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          }
        >
          <Button variant="link" icon={<InfoCircleIcon />} isDisabled={!connection}>
            View details
          </Button>
        </Popover>
      </HelperTextItem>
    </HelperText>
  );
};
