import * as React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  LabelGroup,
  MenuToggleStatus,
  Popover,
  Title,
} from '@patternfly/react-core';
import ConnectionTypeFormFields from '~/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { getDescriptionFromK8sResource } from '~/concepts/k8s/utils';
import UnspecifiedValue from '~/concepts/connectionTypes/fields/UnspecifiedValue';
import SimpleSelect from '~/components/SimpleSelect';
import CategoryLabel from '~/concepts/connectionTypes/CategoryLabel';
import TruncatedText from '~/components/TruncatedText';

type Props = {
  obj?: ConnectionTypeConfigMapObj;
};

// TODO consider refactoring this form for reuse when creating connection type instances
const ConnectionTypePreview: React.FC<Props> = ({ obj }) => {
  const connectionTypeName = obj && obj.metadata.annotations?.['openshift.io/display-name'];
  const connectionTypeDescription = (obj && getDescriptionFromK8sResource(obj)) ?? undefined;
  return (
    <Form>
      <Title headingLevel="h1">Add connection</Title>
      <FormGroup label="Connection type" fieldId="connection-type" isRequired>
        <SimpleSelect
          id="connection-type"
          isFullWidth
          toggleLabel={connectionTypeName || 'Unspecified'}
          isDisabled={!!connectionTypeName}
          toggleProps={connectionTypeName ? undefined : { status: MenuToggleStatus.danger }}
          onChange={() => undefined}
        />
        <HelperText>
          {connectionTypeDescription ? (
            <HelperTextItem>
              <TruncatedText maxLines={2} content={connectionTypeDescription} />
            </HelperTextItem>
          ) : undefined}
          <HelperTextItem>
            <Popover
              headerContent="Connection type details"
              bodyContent={
                <DescriptionList>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Connection type name</DescriptionListTerm>
                    <DescriptionListDescription>
                      {connectionTypeName || <UnspecifiedValue />}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  {connectionTypeDescription ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Connection type description</DescriptionListTerm>
                      <DescriptionListDescription>
                        {connectionTypeDescription || <UnspecifiedValue />}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : undefined}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Category</DescriptionListTerm>
                    <DescriptionListDescription>
                      {obj?.data?.category?.length ? (
                        <LabelGroup>
                          {obj.data.category.map((category) => (
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
      </FormGroup>
      <FormSection title="Connection details" style={{ marginTop: 0 }}>
        <NameDescriptionField
          nameFieldId="connection-details-name"
          descriptionFieldId="connection-details-description"
          nameFieldLabel="Connection name"
          descriptionFieldLabel="Connection description"
          data={{
            name: '',
            description: '',
          }}
        />
        <ConnectionTypeFormFields fields={obj?.data?.fields} isPreview />
      </FormSection>
    </Form>
  );
};

export default ConnectionTypePreview;
