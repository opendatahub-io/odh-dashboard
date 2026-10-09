import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Button,
  Form,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Language } from '@patternfly/react-code-editor';
import { useNavigate } from 'react-router-dom';
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
import { TrackingOutcome } from '@odh-dashboard/ui-core';
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
import {
  fireServingRuntimeTemplateCreated,
  fireServingRuntimeTemplateUpdated,
} from './tracking/servingRuntimeTemplateTracking';

type ServingRuntimeTemplateFormProps =
  | {
      mode: 'add' | 'edit' | 'duplicate';
      sourceTemplate?: TemplateKind;
    }
  | {
      mode: 'install';
      sourceTemplate: TemplateKind;
      onBack: () => void;
      cancelReturnRoute: string;
    };

const ServingRuntimeTemplateFormBody: React.FC<ServingRuntimeTemplateFormProps> = (props) => {
  const { mode, sourceTemplate } = props;
  const listPath = SERVING_RUNTIME_TEMPLATES_TAB_PATH;
  const { dashboardNamespace } = useDashboardNamespace();
  // Settings routes provide this context; Install has no provider and skips refreshData.
  // Its success redirect mounts the list's provider, which watches Templates and loads settings.
  const { refreshData } = React.useContext(CustomServingRuntimeContext);
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';
  const isInstall = mode === 'install';

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
      (isEdit || isInstall) && sourceTemplate
        ? YAML.stringify(sourceTemplate.objects[0])
        : duplicatedServingRuntimeString,
    [isEdit, isInstall, sourceTemplate, duplicatedServingRuntimeString],
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
      !isInstall &&
      code === stringifiedTemplate &&
      enabledPlatforms.includes(ServingRuntimePlatform.SINGLE) === isSinglePlatformEnabled &&
      apiProtocol === selectedAPIProtocol &&
      modelTypesEqual(modelTypes, selectedModelTypes)) ||
    code === '' ||
    !selectedAPIProtocol ||
    selectedModelTypes.length === 0 ||
    loading;

  return (
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
            {isInstall && (
              <Button isDisabled={loading} variant="secondary" onClick={props.onBack}>
                Back
              </Button>
            )}
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
                  if (isEdit) {
                    fireServingRuntimeTemplateUpdated({
                      outcome: TrackingOutcome.submit,
                      success: false,
                      apiProtocol: selectedAPIProtocol,
                      modelTypes: selectedModelTypes.join(','),
                    });
                  } else {
                    fireServingRuntimeTemplateCreated({
                      outcome: TrackingOutcome.submit,
                      success: false,
                      mode: isDuplicate ? 'duplicate' : 'create',
                      ...(isInstall && { source: 'install' }),
                      apiProtocol: selectedAPIProtocol,
                      modelTypes: selectedModelTypes.join(','),
                    });
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
                const selectedModelTypesStr = selectedModelTypes.join(',');
                onClickFunc
                  .then(() => {
                    if (isEdit) {
                      fireServingRuntimeTemplateUpdated({
                        outcome: TrackingOutcome.submit,
                        success: true,
                        apiProtocol: selectedAPIProtocol,
                        modelTypes: selectedModelTypesStr,
                      });
                    } else {
                      fireServingRuntimeTemplateCreated({
                        outcome: TrackingOutcome.submit,
                        success: true,
                        mode: isDuplicate ? 'duplicate' : 'create',
                        ...(isInstall && { source: 'install' }),
                        apiProtocol: selectedAPIProtocol,
                        modelTypes: selectedModelTypesStr,
                      });
                    }
                    if (!isInstall) {
                      refreshData();
                    }
                    navigate(listPath);
                  })
                  .catch((err) => {
                    if (isEdit) {
                      fireServingRuntimeTemplateUpdated({
                        outcome: TrackingOutcome.submit,
                        success: false,
                        apiProtocol: selectedAPIProtocol,
                        modelTypes: selectedModelTypesStr,
                      });
                    } else {
                      fireServingRuntimeTemplateCreated({
                        outcome: TrackingOutcome.submit,
                        success: false,
                        mode: isDuplicate ? 'duplicate' : 'create',
                        ...(isInstall && { source: 'install' }),
                        apiProtocol: selectedAPIProtocol,
                        modelTypes: selectedModelTypesStr,
                      });
                    }
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
              onClick={() => {
                if (isEdit) {
                  fireServingRuntimeTemplateUpdated({ outcome: TrackingOutcome.cancel });
                } else {
                  fireServingRuntimeTemplateCreated({
                    outcome: TrackingOutcome.cancel,
                    mode: isDuplicate ? 'duplicate' : 'create',
                    ...(isInstall && { source: 'install' }),
                  });
                }
                navigate(props.mode === 'install' ? props.cancelReturnRoute : listPath);
              }}
            >
              Cancel
            </Button>
          </ActionGroup>
        </StackItem>
      </Stack>
    </Form>
  );
};

export default ServingRuntimeTemplateFormBody;
