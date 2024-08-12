import * as React from 'react';
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  PageSection,
} from '@patternfly/react-core';
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { ConnectionTypeConfigMapObj, ConnectionTypeField } from '~/concepts/connectionTypes/types';
import ConnectionTypePreviewDrawer from '~/concepts/connectionTypes/ConnectionTypePreviewDrawer';
import {
  createConnectionTypeObj,
  extractConnectionTypeFromMap,
} from '~/concepts/connectionTypes/createConnectionTypeUtils';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { NameDescType } from '~/pages/projects/types';
import { CreateConnectionTypeFooter } from './CreateConnectionTypeFooter';
import { CreateConnectionTypeFieldsTable } from './CreateConnectionTypeFieldsTable';
import { CreateConnectionTypeBreadcrumbs } from './CreateConnectionTypeBreadcrumbs';

type CreateConnectionTypePageProps = {
  prefill?: ConnectionTypeConfigMapObj;
};

export const CreateConnectionTypePage: React.FC<CreateConnectionTypePageProps> = ({ prefill }) => {
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const [prefillNameDesc, prefillEnabled, prefillFields] = extractConnectionTypeFromMap(prefill);

  const [connectionNameDesc, setConnectionNameDesc] = React.useState<NameDescType>(prefillNameDesc);
  const [connectionEnabled, setConnectionEnabled] = React.useState<boolean>(prefillEnabled);
  const [connectionFields] = React.useState<ConnectionTypeField[]>(prefillFields);

  const previewConnectionTypeObj = React.useMemo(
    () =>
      createConnectionTypeObj(
        {
          k8sName: translateDisplayNameForK8s(connectionNameDesc.name),
          displayName: connectionNameDesc.name,
          description: connectionNameDesc.description,
          enabled: connectionEnabled,
          username: '',
        },
        connectionFields,
      ),
    [connectionNameDesc, connectionEnabled, connectionFields],
  );

  return (
    <ConnectionTypePreviewDrawer
      isExpanded={isDrawerExpanded}
      onClose={() => setIsDrawerExpanded(false)}
      obj={previewConnectionTypeObj}
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
                  label="Enable users in your organization to use this connection type when adding connections."
                  id="connection-type-enable"
                  name="connection-type-enable"
                  data-testid="connection-type-enable"
                  isChecked={connectionEnabled}
                  onChange={(_e, value) => setConnectionEnabled(value)}
                />
              </FormGroup>
            </FormSection>
            <FormSection title="Fields" className="pf-v5-u-mt-0">
              Add fields to prompt users to input information, and optionally assign default values
              to those fields.
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
