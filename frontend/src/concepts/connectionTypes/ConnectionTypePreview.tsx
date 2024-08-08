import * as React from 'react';
import { Divider, Form, FormGroup, FormSection, Title } from '@patternfly/react-core';
import FormGroupText from '~/components/FormGroupText';
import ConnectionTypeFormFields from '~/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import UnspecifiedValue from '~/concepts/connectionTypes/fields/UnspecifiedValue';

type Props = {
  obj?: ConnectionTypeConfigMapObj;
};

const ConnectionTypePreview: React.FC<Props> = ({ obj }) => (
  <Form>
    <Title headingLevel="h1">Add connection</Title>
    <FormSection title="Connection type details" style={{ marginTop: 0 }}>
      <FormGroup label="Connection type name" fieldId="connection-type-name">
        <FormGroupText id="connection-type-name">
          {(obj && getDisplayNameFromK8sResource(obj)) || <UnspecifiedValue />}
        </FormGroupText>
      </FormGroup>
      <FormGroup label="Connection type description" fieldId="connection-type-description">
        <FormGroupText id="connection-type-description">
          {(obj && getDescriptionFromK8sResource(obj)) || <UnspecifiedValue />}
        </FormGroupText>
      </FormGroup>
    </FormSection>
    <Divider />
    <FormSection title="Connection details" style={{ marginTop: 0 }}>
      <NameDescriptionField
        nameFieldId="connection-details-name"
        descriptionFieldId="connection-details-description"
        data={{
          name: '',
          description: '',
        }}
      />
      <ConnectionTypeFormFields fields={obj?.data?.fields} isPreview />
    </FormSection>
  </Form>
);

export default ConnectionTypePreview;
