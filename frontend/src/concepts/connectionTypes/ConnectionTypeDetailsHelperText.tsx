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
import { ConnectionTypeConfigMapObj } from './types';
import UnspecifiedValue from './fields/UnspecifiedValue';
import CategoryLabel from './CategoryLabel';

type Props = {
  connectionType: ConnectionTypeConfigMapObj;
  isPreview: boolean;
};

export const ConnectionTypeDetailsHelperText: React.FC<Props> = ({ connectionType, isPreview }) => {
  const displayName = isPreview
    ? connectionType.metadata.annotations?.['openshift.io/display-name']
    : getDisplayNameFromK8sResource(connectionType);
  const description = getDescriptionFromK8sResource(connectionType);

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
                  {connectionType.data?.category?.length ? (
                    <LabelGroup>
                      {connectionType.data.category.map((category) => (
                        <CategoryLabel key={category} category={category} />
                      ))}
                    </LabelGroup>
                  ) : isPreview ? (
                    <UnspecifiedValue />
                  ) : (
                    '-'
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
