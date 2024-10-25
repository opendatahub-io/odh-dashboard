import React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  HelperText,
  HelperTextItem,
  LabelGroup,
  Popover,
} from '@patternfly/react-core';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import TruncatedText from '~/components/TruncatedText';
import { Connection, ConnectionTypeConfigMapObj } from './types';
import CategoryLabel from './CategoryLabel';

type Props = {
  connection: Connection;
  connectionType?: ConnectionTypeConfigMapObj;
};

export const ConnectionDetailsHelperText: React.FC<Props> = ({ connection, connectionType }) => {
  const displayName = getDisplayNameFromK8sResource(connection);
  const description = getDescriptionFromK8sResource(connection);

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
                <DescriptionListDescription>
                  {connectionType?.data?.category?.length ? (
                    <LabelGroup>
                      {connectionType.data.category.map((category) => (
                        <CategoryLabel key={category} category={category} />
                      ))}
                    </LabelGroup>
                  ) : (
                    '-'
                  )}
                </DescriptionListDescription>
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
