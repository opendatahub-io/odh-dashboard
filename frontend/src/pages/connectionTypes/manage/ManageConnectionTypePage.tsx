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
import { uniq } from 'lodash-es';
import { useUser } from '~/redux/selectors';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeField,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/types';
import ConnectionTypePreviewDrawer from '~/concepts/connectionTypes/ConnectionTypePreviewDrawer';
import {
  createConnectionTypeObj,
  extractConnectionTypeFromMap,
} from '~/concepts/connectionTypes/createConnectionTypeUtils';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { NameDescType } from '~/pages/projects/types';
import { MultiSelection, SelectionOptions } from '~/components/MultiSelection';
import { categoryOptions } from '~/pages/connectionTypes/const';
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
  const [category, setCategory] = React.useState<string[]>(prefillCategory);

  const categoryItems = React.useMemo<SelectionOptions[]>(
    () =>
      category
        .filter((c) => !categoryOptions.includes(c))
        .concat(categoryOptions)
        .map((c) => ({ id: c, name: c, selected: category.includes(c) })),
    [category],
  );

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

  const isEnvVarConflict = React.useMemo(() => {
    const envVars = connectionFields.filter(isConnectionTypeDataField).map((f) => f.envVar);
    return uniq(envVars).length !== envVars.length;
  }, [connectionFields]);

  const isValid = React.useMemo(() => {
    const trimmedName = connectionNameDesc.name.trim();
    return Boolean(trimmedName) && !isEnvVarConflict && category.length > 0;
  }, [connectionNameDesc.name, isEnvVarConflict, category]);

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
        errorMessage="Unable to load connection types"
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
              title="Editing this connection type does not affect existing connections of this type."
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
              <FormGroup label="Category" fieldId="connection-type-category" isRequired>
                <MultiSelection
                  inputId="connection-type-category"
                  data-testid="connection-type-category"
                  toggleTestId="connection-type-category-toggle"
                  ariaLabel="Category"
                  placeholder="Select a category"
                  isCreatable
                  value={categoryItems}
                  setValue={(value) => {
                    setCategory(value.filter((v) => v.selected).map((v) => String(v.id)));
                  }}
                />
              </FormGroup>
              <FormGroup label="Enable" fieldId="connection-type-enable">
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
              <FormGroup>
                {isEnvVarConflict ? (
                  <Alert isInline variant="danger" title="Environment variables conflict">
                    Two or more fields are using the same environment variable. Ensure that each
                    field uses a unique environment variable to proceed.
                  </Alert>
                ) : null}
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
