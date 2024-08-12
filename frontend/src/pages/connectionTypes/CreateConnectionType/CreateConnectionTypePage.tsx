import * as React from 'react';
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  PageSection,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import { ConnectionTypeField } from '~/concepts/connectionTypes/types';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import ConnectionTypePreviewDrawer from '~/concepts/connectionTypes/ConnectionTypePreviewDrawer';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { NameDescType } from '~/pages/projects/types';
import { CreateConnectionTypeFooter } from './CreateConnectionTypeFooter';
import { CreateConnectionTypeFieldsTable } from './CreateConnectionTypeFieldsTable';
import { CreateConnectionTypeBreadcrumbs } from './CreateConnectionTypeBreadcrumbs';
import { createConnectionTypeObj } from './CreateConnectionTypeUtils';

type CreateConnectionTypePageProps = {
  prefillNameDesc?: NameDescType;
  prefillEnabled?: boolean;
  prefillFields?: ConnectionTypeField[];
};

export const CreateConnectionTypePage: React.FC<CreateConnectionTypePageProps> = ({
  prefillNameDesc = {
    name: '',
    k8sName: undefined,
    description: '',
  },
  prefillEnabled = false,
  prefillFields = [],
}) => {
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const [connectionNameDesc, setConnectionNameDesc] = React.useState<NameDescType>(prefillNameDesc);
  const [connectionEnabled, setConnectionEnabled] = React.useState<boolean>(prefillEnabled);
  const [connectionFields] = React.useState<ConnectionTypeField[]>(prefillFields);

  return (
    <ConnectionTypePreviewDrawer
      isExpanded={isDrawerExpanded}
      onClose={() => setIsDrawerExpanded(false)}
      obj={createConnectionTypeObj(
        {
          k8sName: translateDisplayNameForK8s(connectionNameDesc.name),
          displayName: connectionNameDesc.name,
          description: connectionNameDesc.description,
          enabled: connectionEnabled,
          username: '',
        },
        connectionFields,
      )}
    >
      <ApplicationsPage
        title="Create connection type"
        loaded
        empty={false}
        errorMessage="Unable load to connection types"
        breadcrumb={<CreateConnectionTypeBreadcrumbs />}
        headerAction={
          isDrawerExpanded ? undefined : (
            <Button
              variant="secondary"
              icon={<OpenDrawerRightIcon />}
              aria-expanded={isDrawerExpanded}
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
              data-testid="preview-drawer-toggle-button"
            >
              Preview
            </Button>
          )
        }
      >
        <PageSection isFilled variant="light" className="pf-v5-u-pt-0">
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
            <FormSection title="Fields" className="pf-v5-u-mt-0">
              <Text component={TextVariants.p}>
                Add fields to prompt users to input information, and optionally assign default
                values to those fields.
              </Text>
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
    </ConnectionTypePreviewDrawer>
  );
};
