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
import { getDescriptionFromK8sResource } from '~/concepts/k8s/utils';
import TruncatedText from '~/components/TruncatedText';
import { ConnectionTypeConfigMapObj } from './types';
import UnspecifiedValue from './fields/UnspecifiedValue';
import CategoryLabel from './CategoryLabel';

type Props = {
  connectionType?: ConnectionTypeConfigMapObj;
};

export const ConnectionTypeDetailsHelperText: React.FC<Props> = ({ connectionType }) => {
  const displayName =
    connectionType && connectionType.metadata.annotations?.['openshift.io/display-name'];
  const description = connectionType && getDescriptionFromK8sResource(connectionType);

  return (
    <HelperText>
      {description && (
        <HelperTextItem>
          <TruncatedText maxLines={2} content={description} />
        </HelperTextItem>
      )}
      <HelperTextItem>
        <Popover
          headerContent="Connection type details"
          bodyContent={
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>Connection type name</DescriptionListTerm>
                <DescriptionListDescription>
                  {displayName || <UnspecifiedValue />}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {description ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Connection type description</DescriptionListTerm>
                  <DescriptionListDescription>
                    {description || <UnspecifiedValue />}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : undefined}
              <DescriptionListGroup>
                <DescriptionListTerm>Category</DescriptionListTerm>
                <DescriptionListDescription>
                  {connectionType?.data?.category?.length ? (
                    <LabelGroup>
                      {connectionType.data.category.map((category) => (
                        <CategoryLabel key={category} category={category} />
                      ))}
                    </LabelGroup>
                  ) : (
                    <UnspecifiedValue />
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          }
        >
          <Button variant="link" isInline>
            View connection type details
          </Button>
        </Popover>
      </HelperTextItem>
    </HelperText>
  );
};
