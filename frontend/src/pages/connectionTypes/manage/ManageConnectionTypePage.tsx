import * as React from 'react';
import {
  Alert,
  AlertActionLink,
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
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeFormData,
} from '~/concepts/connectionTypes/types';
import ConnectionTypePreviewDrawer from '~/concepts/connectionTypes/ConnectionTypePreviewDrawer';
import {
  createConnectionTypeObj,
  extractConnectionTypeFromMap,
} from '~/concepts/connectionTypes/createConnectionTypeUtils';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { MultiSelection, SelectionOptions } from '~/components/MultiSelection';
import { categoryOptions } from '~/pages/connectionTypes/const';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import {
  connectionTypeFormSchema,
  ValidationErrorCodes,
} from '~/concepts/connectionTypes/validationUtils';
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

  const initialValues = React.useMemo<ConnectionTypeFormData>(() => {
    if (prefill) {
      const { category, enabled, fields, username } = extractConnectionTypeFromMap(prefill);
      return { category, enabled, fields, username: username || currentUsername };
    }
    return {
      category: [],
      enabled: true,
      fields: [],
      username: currentUsername,
    };
    // compute default values only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [data, setData] = useGenericObjectState(initialValues);
  const validation = useValidation(data, connectionTypeFormSchema);

  const { category, enabled, fields, username } = data;

  const { data: connectionNameDesc, onDataChange: setConnectionNameDesc } =
    useK8sNameDescriptionFieldData({ initialData: prefill });

  const isDataDirty = React.useRef(data).current !== data;
  const isNameDirty = React.useRef(connectionNameDesc).current !== connectionNameDesc;
  const canSubmit = isDataDirty || isNameDirty || !isEdit;

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
        connectionNameDesc.k8sName.value,
        connectionNameDesc.name,
        connectionNameDesc.description,
        enabled,
        username,
        fields,
        category,
      ),
    [connectionNameDesc, enabled, fields, username, category],
  );

  const isValid =
    React.useMemo(() => isK8sNameDescriptionDataValid(connectionNameDesc), [connectionNameDesc]) &&
    validation.validationResult.success;

  const onCancel = () => {
    navigate('/connectionTypes');
  };

  const pageName = isEdit ? 'Edit connection type' : 'Create connection type';
  return (
    <ValidationContext.Provider value={validation}>
      <ConnectionTypePreviewDrawer
        isExpanded={isDrawerExpanded}
        onClose={() => setIsDrawerExpanded(false)}
        obj={connectionTypeObj}
      >
        <ApplicationsPage
          title={pageName}
          loaded
          empty={false}
          breadcrumb={<ManageConnectionTypeBreadcrumbs name={pageName} />}
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
          {isEdit && prefill ? (
            <PageSection variant="light" className="pf-v5-u-pt-0">
              <Alert
                isInline
                variant="warning"
                title="Consider duplicating"
                actionLinks={
                  <AlertActionLink
                    data-testid="duplicate-connection-type"
                    onClick={() => {
                      navigate(`/connectionTypes/duplicate/${prefill.metadata.name}`, {
                        state: {
                          connectionType: connectionTypeObj,
                        },
                      });
                    }}
                  >
                    Duplicate
                  </AlertActionLink>
                }
              >
                Editing this connection type does not affect existing connections of this type. To
                keep track of previous versions of this connection type, consider duplicating it.
              </Alert>
            </PageSection>
          ) : undefined}
          <PageSection isFilled variant="light" className="pf-v5-u-pt-0">
            <Form>
              <FormSection title="Type details" style={{ maxWidth: 625 }}>
                <K8sNameDescriptionField
                  dataTestId="connection-type"
                  nameLabel="Connection type name"
                  descriptionLabel="Connection type description"
                  data={connectionNameDesc}
                  onDataChange={setConnectionNameDesc}
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
                      setData(
                        'category',
                        value.filter((v) => v.selected).map((v) => String(v.id)),
                      );
                    }}
                  />
                </FormGroup>
              </FormSection>
              <FormGroup label="Enable" fieldId="connection-type-enable">
                <Checkbox
                  label="Enable users in your organization to use this connection type when adding connections."
                  id="connection-type-enable"
                  name="connection-type-enable"
                  data-testid="connection-type-enable"
                  isChecked={enabled}
                  onChange={(_e, value) => setData('enabled', value)}
                />
              </FormGroup>
              <FormSection title="Fields" className="pf-v5-u-mt-0">
                <FormGroup>
                  {validation.hasValidationIssue(
                    ['fields'],
                    ValidationErrorCodes.FIELDS_ENV_VAR_CONFLICT,
                  ) ? (
                    <Alert isInline variant="danger" title="Environment variables conflict">
                      Two or more fields are using the same environment variable. Ensure that each
                      field uses a unique environment variable to proceed.
                    </Alert>
                  ) : null}
                  <ManageConnectionTypeFieldsTable
                    fields={fields}
                    onFieldsChange={(value) => setData('fields', value)}
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
              isSaveDisabled={!canSubmit || !isValid}
              saveButtonLabel={isEdit ? 'Save' : 'Create'}
            />
          </PageSection>
        </ApplicationsPage>
      </ConnectionTypePreviewDrawer>
    </ValidationContext.Provider>
  );
};

export default ManageConnectionTypePage;
