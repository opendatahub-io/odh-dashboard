import * as React from 'react';
import { Checkbox, Form, FormGroup, FormSection, PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ConnectionTypeField } from '~/concepts/connectionTypes/types';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { NameDescType } from '~/pages/projects/types';
import { CreateConnectionTypeFooter } from './CreateConnectionTypeFooter';
import { CreateConnectionTypeFieldsTable } from './CreateConnectionTypeFieldsTable';
import { CreateConnectionTypeBreadcrumbs } from './CreateConnectionTypeBreadcrumbs';

type CreateConnectionTypePageProps = {
  prefillNameDesc?: NameDescType;
  prefillEnabled?: boolean;
  prefillFields?: ConnectionTypeField[];
};

export const CreateConnectionTypePage: React.FC<CreateConnectionTypePageProps> = ({
  prefillNameDesc,
  prefillEnabled,
  prefillFields,
}) => {
  const [connectionNameDesc, setConnectionNameDesc] = React.useState<NameDescType>(
    prefillNameDesc || {
      name: '',
      k8sName: undefined,
      description: '',
    },
  );
  const [connectionEnabled, setConnectionEnabled] = React.useState<boolean>(
    prefillEnabled || false,
  );
  const [connectionFields] = React.useState<ConnectionTypeField[]>(prefillFields || []);

  return (
    <ApplicationsPage
      title="Create connection type"
      loaded
      empty={false}
      errorMessage="Unable load to connection types"
      breadcrumb={<CreateConnectionTypeBreadcrumbs />}
    >
      <PageSection isFilled variant="light">
        <Form>
          <FormSection title="Type details" style={{ maxWidth: 625 }}>
            <NameDescriptionField
              nameFieldId="connection-type-name"
              nameFieldLabel="Connection type name"
              descriptionFieldId="connection-type-description"
              descriptionFieldLabel="Connection type description"
              data={connectionNameDesc}
              setData={setConnectionNameDesc}
              autoFocusName
            />
            <FormGroup label="Enable">
              <Checkbox
                label="Connection is enabled and therefore available to use by users in your org"
                id="connection-type-enable"
                name="connection-type-enable"
                data-testid="connection-type-enable"
                isChecked={connectionEnabled}
                onChange={(_e, value) => setConnectionEnabled(value)}
              />
            </FormGroup>
          </FormSection>
          <FormSection title="Fields">
            <FormGroup>
              <CreateConnectionTypeFieldsTable fields={connectionFields} />
            </FormGroup>
          </FormSection>
        </Form>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <CreateConnectionTypeFooter
          nameDesc={connectionNameDesc}
          enabled={connectionEnabled}
          fields={connectionFields}
        />
      </PageSection>
    </ApplicationsPage>
  );
};
