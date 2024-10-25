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
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import TruncatedText from '~/components/TruncatedText';
import { Connection, ConnectionTypeConfigMapObj } from './types';
import { getConnectionTypeDisplayName } from './utils';

type Props = {
  connection: Connection;
  connectionType?: ConnectionTypeConfigMapObj;
};

export const ConnectionDetailsHelperText: React.FC<Props> = ({ connection, connectionType }) => {
  const displayName = getDisplayNameFromK8sResource(connection);
  const description = getDescriptionFromK8sResource(connection);
  const connectionTypeName = getConnectionTypeDisplayName(connection, connectionType);

  return (
    <HelperText>
      {description && (
        <HelperTextItem>
          <TruncatedText maxLines={2} content={description} />
        </HelperTextItem>
      )}
      <HelperTextItem>
        <Popover
          headerContent="Connection details"
          bodyContent={
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>Connection name</DescriptionListTerm>
                <DescriptionListDescription>{displayName}</DescriptionListDescription>
              </DescriptionListGroup>
              {description ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Connection description</DescriptionListTerm>
                  <DescriptionListDescription>{description}</DescriptionListDescription>
                </DescriptionListGroup>
              ) : undefined}
              <DescriptionListGroup>
                <DescriptionListTerm>Type</DescriptionListTerm>
                <DescriptionListDescription>{connectionTypeName}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          }
        >
          <Button variant="link" isInline>
            View connection details
          </Button>
        </Popover>
      </HelperTextItem>
    </HelperText>
  );
};
