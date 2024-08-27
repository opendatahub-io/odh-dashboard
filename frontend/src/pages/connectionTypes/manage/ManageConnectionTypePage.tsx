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
import { SelectionOptions } from '~/components/MultiSelection';
import { GroupsConfigField } from '~/pages/groupSettings/groupTypes';
import { useWatchGroups } from '~/utilities/useWatchGroups';
import { MultiSelection } from '~/components/MultiSelection';

type Props = {
  prefill?: ConnectionTypeConfigMapObj;
  isEdit?: boolean;
  onSave: (obj: ConnectionTypeConfigMapObj) => Promise<void>;
  typeAhead?: string[];
};

const ManageConnectionTypePage: React.FC<Props> = ({ prefill, isEdit, onSave, typeAhead }) => {
  const navigate = useNavigate();
  const { username: currentUsername } = useUser();

  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const { groupSettings, setGroupSettings, setIsGroupSettingsChanged } = useWatchGroups();

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

  const [categoryOptions, setCategoryOptions] = React.useState<SelectionOptions[]>([
    { id: 'object-storage', name: 'Object storage', selected: true },
    { id: 'database', name: 'Database', selected: false },
    { id: 'model-registry', name: 'Model registry', selected: false },
    { id: 'uri', name: 'URI', selected: false },
  ]);

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

  const userDesc = 'Select a category for the connection type';

  const handleMenuItemSelection = (newState: SelectionOptions[], field: GroupsConfigField) => {
    if (field === GroupsConfigField.ADMIN) {
      setCategoryOptions(newState); // Update the categoryOptions state
    }

    switch (field) {
      case GroupsConfigField.ADMIN:
        setGroupSettings({
          ...groupSettings,
          adminGroups: newState.map((opt) => ({
            id: Number(opt.id),
            name: opt.name,
            enabled: opt.selected || false,
          })),
        });
        break;
      case GroupsConfigField.USER:
        setGroupSettings({
          ...groupSettings,
          allowedGroups: newState.map((opt) => ({
            id: Number(opt.id),
            name: opt.name,
            enabled: opt.selected || false,
          })),
        });
        break;
    }
    setIsGroupSettingsChanged(true);
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

              <FormGroup label="Category" isRequired>
                <MultiSelection
                  id="category-table"
                  toggleTestId="category-table"
                  ariaLabel={userDesc}
                  value={categoryOptions}
                  setValue={(newState) =>
                    handleMenuItemSelection(newState, GroupsConfigField.ADMIN)
                  }
                  selectionRequired
                  isCreatable
                />
              </FormGroup>
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
