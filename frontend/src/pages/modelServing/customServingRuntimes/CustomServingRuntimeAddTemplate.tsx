import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Language } from '@patternfly/react-code-editor';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import YAML from 'yaml';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { TemplateKind } from '~/k8sTypes';
import { useDashboardNamespace } from '~/redux/selectors';
import DashboardCodeEditor from '~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import {
  createServingRuntimeTemplateBackend,
  updateServingRuntimeTemplateBackend,
} from '~/services/templateService';
import { ServingRuntimePlatform } from '~/types';
import CustomServingRuntimePlatformsSelector from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimePlatformsSelector';
import {
  getEnabledPlatformsFromTemplate,
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  isServingRuntimeKind,
} from './utils';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type CustomServingRuntimeAddTemplateProps = {
  existingTemplate?: TemplateKind;
};

const CustomServingRuntimeAddTemplate: React.FC<CustomServingRuntimeAddTemplateProps> = ({
  existingTemplate,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { refreshData } = React.useContext(CustomServingRuntimeContext);
  const { state }: { state?: { template: TemplateKind } } = useLocation();

  const copiedServingRuntimeString = React.useMemo(
    () =>
      state
        ? YAML.stringify({
            ...state.template.objects[0],
            metadata: {
              ...state.template.objects[0].metadata,
              name: `${getServingRuntimeNameFromTemplate(state.template)}-copy`,
              annotations: {
                ...state.template.objects[0].metadata.annotations,
                'openshift.io/display-name': `Copy of ${getServingRuntimeDisplayNameFromTemplate(
                  state.template,
                )}`,
                'openshift.io/description':
                  state.template.objects[0].metadata.annotations?.['openshift.io/description'],
              },
            },
          })
        : '',
    [state],
  );

  const copiedServingRuntimePlatforms = React.useMemo(
    () => (state ? getEnabledPlatformsFromTemplate(state.template) : []),
    [state],
  );

  const stringifiedTemplate = React.useMemo(
    () =>
      existingTemplate ? YAML.stringify(existingTemplate.objects[0]) : copiedServingRuntimeString,
    [copiedServingRuntimeString, existingTemplate],
  );

  const enabledPlatforms: ServingRuntimePlatform[] = React.useMemo(
    () =>
      existingTemplate
        ? getEnabledPlatformsFromTemplate(existingTemplate)
        : copiedServingRuntimePlatforms,
    [existingTemplate, copiedServingRuntimePlatforms],
  );

  const [code, setCode] = React.useState(stringifiedTemplate);
  const [selectedPlatforms, setSelectedPlatforms] =
    React.useState<ServingRuntimePlatform[]>(enabledPlatforms);
  const isSinglePlatformEnabled = selectedPlatforms.includes(ServingRuntimePlatform.SINGLE);
  const isMultiPlatformEnabled = selectedPlatforms.includes(ServingRuntimePlatform.MULTI);
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const navigate = useNavigate();

  const isDisabled =
    (!state &&
      code === stringifiedTemplate &&
      enabledPlatforms.includes(ServingRuntimePlatform.SINGLE) === isSinglePlatformEnabled &&
      enabledPlatforms.includes(ServingRuntimePlatform.MULTI) === isMultiPlatformEnabled) ||
    code === '' ||
    selectedPlatforms.length === 0 ||
    loading;

  return (
    <ApplicationsPage
      title={
        existingTemplate
          ? `Edit ${getServingRuntimeDisplayNameFromTemplate(existingTemplate)}`
          : 'Add serving runtime'
      }
      description={
        existingTemplate
          ? 'Modify properties for your serving runtime.'
          : 'Add a new runtime that will be available for users on this cluster.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>Settings</BreadcrumbItem>
          <BreadcrumbItem render={() => <Link to="/servingRuntimes">Serving runtimes</Link>} />
          {existingTemplate && (
            <BreadcrumbItem>
              {getServingRuntimeDisplayNameFromTemplate(existingTemplate)}
            </BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {existingTemplate ? 'Edit' : 'Add'} serving runtime
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Form style={{ height: '100%' }}>
        <Stack hasGutter>
          <StackItem>
            <CustomServingRuntimePlatformsSelector
              isSinglePlatformEnabled={isSinglePlatformEnabled}
              isMultiPlatformEnabled={isMultiPlatformEnabled}
              setSelectedPlatforms={setSelectedPlatforms}
            />
          </StackItem>
          <StackItem isFilled>
            <DashboardCodeEditor
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
                  const onClickFunc = existingTemplate
                    ? updateServingRuntimeTemplateBackend(
                        existingTemplate,
                        code,
                        dashboardNamespace,
                        selectedPlatforms,
                      )
                    : createServingRuntimeTemplateBackend(
                        code,
                        dashboardNamespace,
                        selectedPlatforms,
                      );
                  onClickFunc
                    .then(() => {
                      refreshData();
                      navigate(`/servingRuntimes`);
                    })
                    .catch((err) => {
                      setError(err);
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }}
              >
                {existingTemplate ? 'Update' : 'Add'}
              </Button>
              <Button
                isDisabled={loading}
                variant="link"
                id="cancel-button"
                onClick={() => navigate(`/servingRuntimes`)}
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
