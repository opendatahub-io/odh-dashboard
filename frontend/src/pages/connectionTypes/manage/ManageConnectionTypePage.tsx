import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  Checkbox,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSection,
  PageSection,
  Popover,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { OpenDrawerRightIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useUser } from '#~/redux/selectors';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeFormData,
} from '#~/concepts/connectionTypes/types';
import ConnectionTypePreviewDrawer from '#~/concepts/connectionTypes/ConnectionTypePreviewDrawer';
import {
  createConnectionTypeObj,
  extractConnectionTypeFromMap,
} from '#~/concepts/connectionTypes/createConnectionTypeUtils';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { categoryOptions } from '#~/pages/connectionTypes/const';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import { useValidation, ValidationContext } from '#~/utilities/useValidation';
import {
  connectionTypeFormSchema,
  ValidationErrorCodes,
} from '#~/concepts/connectionTypes/validationUtils';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import {
  filterModelServingConnectionTypes,
  getModelServingCompatibility,
} from '#~/concepts/connectionTypes/utils';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import SimpleMenuActions from '#~/components/SimpleMenuActions';
import { joinWithCommaAnd } from '#~/utilities/string';
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

  const [connectionTypes] = useWatchConnectionTypes();
  const modelServingConnectionTypesMetadata = React.useMemo(
    () => filterModelServingConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const allCategories = React.useMemo(
    () =>
      new Set([...categoryOptions, ...connectionTypes.map((ct) => ct.data?.category ?? []).flat()]),
    [connectionTypes],
  );

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
    useK8sNameDescriptionFieldData({
      initialData: prefill,
      safePrefix: 'ct-',
      staticPrefix: true,
    });

  const isDataDirty = React.useRef(data).current !== data;
  const isNameDirty = React.useRef(connectionNameDesc).current !== connectionNameDesc;
  const canSubmit = isDataDirty || isNameDirty || !isEdit;

  const categoryItems = React.useMemo<SelectionOptions[]>(
    () =>
      [...new Set([...allCategories, ...category])].toSorted().map((c) => ({
        id: c,
        name: c,
        selected: category.includes(c),
      })),
    [category, allCategories],
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

  const modelServingCompatibleTypes = React.useMemo(
    () => getModelServingCompatibility(connectionTypeObj),
    [connectionTypeObj],
  );

  const isValid =
    React.useMemo(() => isK8sNameDescriptionDataValid(connectionNameDesc), [connectionNameDesc]) &&
    validation.validationResult.success;

  const onCancel = () => {
    navigate('/settings/environment-setup/connection-types');
  };

  const pageName = isEdit ? 'Edit connection type' : 'Create connection type';
  const hasValidationIssue = validation.hasValidationIssue(
    ['fields'],
    ValidationErrorCodes.FIELDS_ENV_VAR_CONFLICT,
  );

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
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pt-0">
              <Alert
                isInline
                variant="warning"
                title="Consider duplicating"
                actionLinks={
                  <AlertActionLink
                    data-testid="duplicate-connection-type"
                    onClick={() => {
                      navigate(
                        `/settings/environment-setup/connection-types/duplicate/${prefill.metadata.name}`,
                        {
                          state: {
                            connectionType: connectionTypeObj,
                          },
                        },
                      );
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
          <PageSection hasBodyWrapper={false} isFilled className="pf-v6-u-pt-0">
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
              <FormSection
                className="pf-v6-u-mt-0"
                title={
                  <Flex gap={{ default: 'gapSm' }}>
                    <FlexItem>Fields</FlexItem>
                    {modelServingConnectionTypesMetadata.length > 0 ? (
                      <>
                        <FlexItem>
                          <SimpleMenuActions
                            testId="select-model-serving-compatible-type"
                            toggleLabel="Select a model serving compatible type"
                            variant="secondary"
                            dropdownItems={modelServingConnectionTypesMetadata.map((t) => ({
                              key: t.key,
                              label: t.name,
                              onClick: () => {
                                setData('fields', [
                                  ...fields,
                                  {
                                    type: 'section',
                                    name: t.name,
                                    description: `Configure the fields that make this connection compatible with ${t.name}.`,
                                  },
                                  ...(t.type.data?.fields ?? []),
                                ]);
                              },
                            }))}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Popover
                            headerContent="Model serving compatible types "
                            bodyContent={
                              <>
                                <Content>
                                  Model serving compatible connection types can be used for model
                                  serving. A connection can use one of multiple different methods,
                                  such as S3 compatible storage or URI, for serving models.
                                </Content>
                                <Content>
                                  Select a type to automatically add the fields required to use its
                                  corresponding model serving method.
                                </Content>
                              </>
                            }
                          >
                            <DashboardPopupIconButton
                              icon={<OutlinedQuestionCircleIcon />}
                              aria-label="More info for section heading"
                            />
                          </Popover>
                        </FlexItem>
                      </>
                    ) : undefined}
                  </Flex>
                }
              >
                <FormGroup>
                  {modelServingCompatibleTypes.length > 0 || hasValidationIssue ? (
                    <Flex gap={{ default: 'gapMd' }} direction={{ default: 'column' }}>
                      {modelServingCompatibleTypes.length > 0 ? (
                        <FlexItem>
                          <Alert
                            data-testid="compatible-model-serving-types-alert"
                            isInline
                            variant="info"
                            title={`This connection type is compatible with ${joinWithCommaAnd(
                              modelServingCompatibleTypes,
                              {
                                singlePrefix: 'the ',
                                singleSuffix: ' model serving type.',
                                multiSuffix: ' model serving types.',
                              },
                            )}`}
                          />
                        </FlexItem>
                      ) : undefined}
                      {hasValidationIssue ? (
                        <FlexItem>
                          <Alert isInline variant="danger" title="Environment variables conflict">
                            Two or more fields are using the same environment variable. Ensure that
                            each field uses a unique environment variable to proceed.
                          </Alert>
                        </FlexItem>
                      ) : undefined}
                    </Flex>
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
            hasBodyWrapper={false}
            stickyOnBreakpoint={{ default: 'bottom' }}
            style={{ flexGrow: 0 }}
          >
            <CreateConnectionTypeFooter
              onSave={() =>
                onSave(connectionTypeObj).then(() => {
                  navigate('/settings/environment-setup/connection-types');
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
