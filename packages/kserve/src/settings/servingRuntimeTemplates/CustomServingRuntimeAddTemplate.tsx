import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Form,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Language } from '@patternfly/react-code-editor';
import { Link, useNavigate, useParams } from 'react-router-dom';
import YAML from 'yaml';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimePlatform,
  ServingRuntimeModelType,
  getAPIProtocolFromTemplate,
  getEnabledPlatformsFromTemplate,
  getModelTypesFromTemplate,
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  isServingRuntimeKind,
} from '@odh-dashboard/model-serving/shared';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import DashboardCodeEditor from '@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor';
import {
  createServingRuntimeTemplateBackend,
  updateServingRuntimeTemplateBackend,
} from '@odh-dashboard/internal/services/templateService';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';
import CustomServingRuntimeAPIProtocolSelector from './CustomServingRuntimeAPIProtocolSelector';
import CustomServingRuntimeModelTypeSelector from './CustomServingRuntimeModelTypeSelector';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from './paths';

type CustomServingRuntimeAddTemplateProps = {
  mode: 'add' | 'edit' | 'duplicate';
  sourceTemplate?: TemplateKind;
};

const CustomServingRuntimeAddTemplate: React.FC<CustomServingRuntimeAddTemplateProps> = ({
  mode,
  sourceTemplate,
}) => {
  const listPath = SERVING_RUNTIME_TEMPLATES_TAB_PATH;
  const { dashboardNamespace } = useDashboardNamespace();
  const { refreshData } = React.useContext(CustomServingRuntimeContext);
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';

  const duplicatedServingRuntimeString = React.useMemo(
    () =>
      isDuplicate && sourceTemplate
        ? YAML.stringify({
            ...sourceTemplate.objects[0],
            metadata: {
              ...sourceTemplate.objects[0].metadata,
              name: `${getServingRuntimeNameFromTemplate(sourceTemplate)}-copy`,
              annotations: {
                ...sourceTemplate.objects[0].metadata.annotations,
                'openshift.io/display-name': `Copy of ${getServingRuntimeDisplayNameFromTemplate(
                  sourceTemplate,
                )}`,
                'openshift.io/description':
                  sourceTemplate.objects[0].metadata.annotations?.['openshift.io/description'],
              },
            },
          })
        : '',
    [isDuplicate, sourceTemplate],
  );

  const stringifiedTemplate = React.useMemo(
    () =>
      isEdit && sourceTemplate
        ? YAML.stringify(sourceTemplate.objects[0])
        : duplicatedServingRuntimeString,
    [isEdit, sourceTemplate, duplicatedServingRuntimeString],
  );

  const enabledPlatforms: ServingRuntimePlatform[] = React.useMemo(
    () => (sourceTemplate ? getEnabledPlatformsFromTemplate(sourceTemplate) : []),
    [sourceTemplate],
  );

  const apiProtocol: ServingRuntimeAPIProtocol | undefined = React.useMemo(
    () => (sourceTemplate ? getAPIProtocolFromTemplate(sourceTemplate) : undefined),
    [sourceTemplate],
  );

  const modelTypes: ServingRuntimeModelType[] = React.useMemo(
    () => (sourceTemplate ? getModelTypesFromTemplate(sourceTemplate) : []),
    [sourceTemplate],
  );

  const [code, setCode] = React.useState(stringifiedTemplate);
  const isSinglePlatformEnabled = enabledPlatforms.includes(ServingRuntimePlatform.SINGLE);
  const [selectedAPIProtocol, setSelectedAPIProtocol] = React.useState<
    ServingRuntimeAPIProtocol | undefined
  >(apiProtocol);
  const [selectedModelTypes, setSelectedModelTypes] =
    React.useState<ServingRuntimeModelType[]>(modelTypes);
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const navigate = useNavigate();

  const modelTypesEqual = (a: ServingRuntimeModelType[], b: ServingRuntimeModelType[]) => {
    if (a.length !== b.length) {
      return false;
    }
    const sortedA = [...a].toSorted();
    const sortedB = [...b].toSorted();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  const isDisabled =
    (!isDuplicate &&
      code === stringifiedTemplate &&
      enabledPlatforms.includes(ServingRuntimePlatform.SINGLE) === isSinglePlatformEnabled &&
      apiProtocol === selectedAPIProtocol &&
      modelTypesEqual(modelTypes, selectedModelTypes)) ||
    code === '' ||
    !selectedAPIProtocol ||
    selectedModelTypes.length === 0 ||
    loading;

  return (
    <ApplicationsPage
      title={
        isEdit && sourceTemplate
          ? `Edit ${getServingRuntimeDisplayNameFromTemplate(sourceTemplate)}`
          : `${isDuplicate ? 'Duplicate' : 'Add'} serving runtime`
      }
      description={
        isEdit
          ? 'Modify properties for your serving runtime.'
          : isDuplicate
          ? 'Add a new, editable runtime by duplicating an existing runtime.'
          : 'Add a new runtime that will be available for users on this cluster.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={listPath}>Serving runtime templates</Link>} />
          {isEdit && sourceTemplate && (
            <BreadcrumbItem>
              {getServingRuntimeDisplayNameFromTemplate(sourceTemplate)}
            </BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {isEdit ? 'Edit' : isDuplicate ? 'Duplicate' : 'Add'} serving runtime
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Form className="pf-v6-u-h-100">
        <Stack hasGutter>
          <StackItem>
            <CustomServingRuntimeAPIProtocolSelector
              selectedAPIProtocol={selectedAPIProtocol}
              setSelectedAPIProtocol={setSelectedAPIProtocol}
            />
          </StackItem>
          <StackItem>
            <CustomServingRuntimeModelTypeSelector
              selectedModelTypes={selectedModelTypes}
              setSelectedModelTypes={setSelectedModelTypes}
            />
          </StackItem>
          <StackItem isFilled>
            <DashboardCodeEditor
              testId="dashboard-code-editor"
              code={code}
              isUploadEnabled
              isLanguageLabelVisible
              language={Language.yaml}
              height="100%"
              options={{ tabSize: 2 }}
              emptyStateTitle="Add a serving runtime"
              emptyStateBody="Drag a file here, upload files, or start from scratch."
              emptyStateButton="Upload files"
              onCodeChange={(codeChanged: string) => {
                setCode(codeChanged);
              }}
            />
          </StackItem>
          {error && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title={error.name}
                actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <ActionGroup>
              <Button
                isDisabled={isDisabled}
                variant="primary"
                id="create-button"
                data-testid="create-button"
                isLoading={loading}
                onClick={() => {
                  try {
                    isServingRuntimeKind(YAML.parse(code));
                  } catch (e) {
                    if (e instanceof Error) {
                      setError(e);
                    }
                    return;
                  }
                  setIsLoading(true);
                  // TODO: Revert back to pass through api once we migrate admin panel
                  const onClickFunc =
                    isEdit && sourceTemplate
                      ? updateServingRuntimeTemplateBackend(
                          sourceTemplate,
                          code,
                          dashboardNamespace,
                          selectedAPIProtocol,
                          selectedModelTypes,
                        )
                      : createServingRuntimeTemplateBackend(
                          code,
                          dashboardNamespace,
                          selectedAPIProtocol,
                          selectedModelTypes,
                        );
                  onClickFunc
                    .then(() => {
                      refreshData();
                      navigate(listPath);
                    })
                    .catch((err) => {
                      setError(err);
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button
                isDisabled={loading}
                variant="link"
                id="cancel-button"
                onClick={() => navigate(listPath)}
              >
                Cancel
              </Button>
            </ActionGroup>
          </StackItem>
        </Stack>
      </Form>
    </ApplicationsPage>
  );
};
export default CustomServingRuntimeAddTemplate;

export const ServingRuntimeTemplateFormByName: React.FC<{
  mode: 'edit' | 'duplicate';
}> = ({ mode }) => {
  const listPath = SERVING_RUNTIME_TEMPLATES_TAB_PATH;
  const { servingRuntimeName } = useParams<{ servingRuntimeName: string }>();
  const {
    servingRuntimeTemplates: [templates],
  } = React.useContext(CustomServingRuntimeContext);
  const sourceTemplate = templates.find(
    (template) => getServingRuntimeNameFromTemplate(template) === servingRuntimeName,
  );

  // The named template must exist (the provider gates on loaded context). When it
  // doesn't — a deep link or reload to a deleted/renamed runtime — explain rather
  // than silently redirect. Matches the source EditTemplate not-found state,
  // generalized to cover duplicate.
  if (!sourceTemplate) {
    const operationLabel = mode === 'duplicate' ? 'Duplicate' : 'Edit';
    return (
      <ApplicationsPage
        loaded
        empty={false}
        title={`${operationLabel} serving runtime`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem render={() => <Link to={listPath}>Serving runtime templates</Link>} />
            <BreadcrumbItem isActive>{operationLabel} serving runtime</BreadcrumbItem>
          </Breadcrumb>
        }
        provideChildrenPadding
      >
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            titleText={`Unable to ${mode === 'duplicate' ? 'duplicate' : 'edit'} serving runtime`}
          >
            <EmptyStateBody>
              We were unable to find a serving runtime named &quot;{servingRuntimeName}&quot;.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                component={(props: React.ComponentProps<'a'>) => <Link {...props} to={listPath} />}
              >
                Return to the list
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      </ApplicationsPage>
    );
  }

  // Key by the resolved template so the form remounts (and re-seeds its state
  // from the new source) when the target runtime changes while this component
  // stays mounted — e.g. navigating directly from /edit/a to /edit/b. The form
  // seeds code/selectors from props via useState, which only run on mount.
  return (
    <CustomServingRuntimeAddTemplate
      key={sourceTemplate.metadata.name}
      mode={mode}
      sourceTemplate={sourceTemplate}
    />
  );
};
