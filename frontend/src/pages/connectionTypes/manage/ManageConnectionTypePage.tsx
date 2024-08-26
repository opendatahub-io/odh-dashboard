import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  PageSection,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import { useUser } from '~/redux/selectors';
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
import CreateConnectionTypeFooter from './ManageConnectionTypeFooter';
import ManageConnectionTypeFieldsTable from './ManageConnectionTypeFieldsTable';
import ManageConnectionTypeBreadcrumbs from './ManageConnectionTypeBreadcrumbs';

type Props = {
  prefill?: ConnectionTypeConfigMapObj;
  isEdit?: boolean;
  onSave: (obj: ConnectionTypeConfigMapObj) => Promise<void>;
};

const ManageConnectionTypePage: React.FC<Props> = ({ prefill, isEdit, onSave }) => {
  const navigate = useNavigate();
  const { username: currentUsername } = useUser();

  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const {
    k8sName: prefillK8sName,
    name: prefillName,
    description: prefillDescription,
    enabled: prefillEnabled,
    fields: prefillFields,
    username: prefillUsername,
    category: prefillCategory,
  } = extractConnectionTypeFromMap(prefill);

  const username = prefillUsername || currentUsername;

  const [connectionNameDesc, setConnectionNameDesc] = React.useState<NameDescType>({
    k8sName: prefillK8sName,
    name: prefillName,
    description: prefillDescription,
  });
  const [connectionEnabled, setConnectionEnabled] = React.useState<boolean>(prefillEnabled);
  const [connectionFields, setConnectionFields] =
    React.useState<ConnectionTypeField[]>(prefillFields);
  const [category] = React.useState<string[]>(prefillCategory);

  const connectionTypeObj = React.useMemo(
    () =>
      createConnectionTypeObj(
        connectionNameDesc.k8sName || translateDisplayNameForK8s(connectionNameDesc.name),
        connectionNameDesc.name,
        connectionNameDesc.description,
        connectionEnabled,
        username,
        connectionFields,
        category,
      ),
    [connectionNameDesc, connectionEnabled, connectionFields, username, category],
  );

  const isValid = React.useMemo(() => {
    const trimmedName = connectionNameDesc.name.trim();
    return Boolean(trimmedName);
  }, [connectionNameDesc.name]);

  const onCancel = () => {
    navigate('/connectionTypes');
  };

  return (
    <ConnectionTypePreviewDrawer
      isExpanded={isDrawerExpanded}
      onClose={() => setIsDrawerExpanded(false)}
      obj={connectionTypeObj}
    >
      <ApplicationsPage
        title={isEdit ? 'Edit connection type' : 'Create connection type'}
        loaded
        empty={false}
        errorMessage="Unable load to connection types"
        breadcrumb={<ManageConnectionTypeBreadcrumbs />}
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
        {isEdit ? (
          <PageSection variant="light" className="pf-v5-u-pt-0">
            <Alert
              isInline
              variant="warning"
              title="Editing this connection will not affect existing connections of this type."
            />
          </PageSection>
        ) : undefined}
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
                <ManageConnectionTypeFieldsTable
                  fields={connectionFields}
                  onFieldsChange={setConnectionFields}
                />
              </FormGroup>
            </FormSection>
          </Form>
        </PageSection>
        <PageSection
          stickyOnBreakpoint={{ default: 'bottom' }}
          variant="light"
          style={{ flexGrow: 0 }}
        >
          <CreateConnectionTypeFooter
            onSave={() =>
              onSave(connectionTypeObj).then(() => {
                navigate('/connectionTypes');
              })
            }
            onCancel={onCancel}
            isSaveDisabled={!isValid}
            saveButtonLabel={isEdit ? 'Save' : 'Create'}
          />
        </PageSection>
      </ApplicationsPage>
    </ConnectionTypePreviewDrawer>
  );
};

export default ManageConnectionTypePage;
