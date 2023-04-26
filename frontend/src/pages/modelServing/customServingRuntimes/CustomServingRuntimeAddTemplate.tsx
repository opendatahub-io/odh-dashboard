import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { Link, useNavigate } from 'react-router-dom';
import YAML from 'yaml';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { TemplateKind } from '~/k8sTypes';
import { createServingRuntimeTemplate, updateServingRuntimeTemplate } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import { getTemplateDisplayName } from '~/pages/modelServing/customServingRuntimes/utils';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type CustomServingRuntimeAddTemplateProps = {
  existingCustomServingRuntime?: TemplateKind;
};

const CustomServingRuntimeAddTemplate: React.FC<CustomServingRuntimeAddTemplateProps> = ({
  existingCustomServingRuntime,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { refreshData } = React.useContext(CustomServingRuntimeContext);

  const [code, setCode] = React.useState('');
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const navigate = useNavigate();

  const stringifiedTemplate = existingCustomServingRuntime
    ? YAML.stringify(existingCustomServingRuntime.objects[0])
    : '';

  React.useEffect(() => {
    setCode(stringifiedTemplate);
  }, [stringifiedTemplate]);

  return (
    <ApplicationsPage
      title={
        existingCustomServingRuntime
          ? `Edit ${getTemplateDisplayName(existingCustomServingRuntime)}`
          : 'Add serving runtime'
      }
      description={
        existingCustomServingRuntime
          ? 'Modify properties for your serving runtime.'
          : 'Add a new runtime that will be available for Data Science users on this cluster.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>Settings</BreadcrumbItem>
          <BreadcrumbItem render={() => <Link to="/servingRuntimes">Serving runtimes</Link>} />
          {existingCustomServingRuntime && (
            <BreadcrumbItem>{getTemplateDisplayName(existingCustomServingRuntime)}</BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {existingCustomServingRuntime ? 'Edit' : 'Add'} serving runtime
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <CodeEditor
            code={code}
            isUploadEnabled
            isDownloadEnabled
            isCopyEnabled
            isLanguageLabelVisible
            language={Language.yaml}
            height="600px"
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
              title="Error"
              actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
            >
              <p>{error.message}</p>
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <StackItem>
            <ActionList>
              <ActionListItem>
                <Button
                  isDisabled={code === stringifiedTemplate || loading}
                  variant="primary"
                  id="create-button"
                  isLoading={loading}
                  onClick={() => {
                    setIsLoading(true);
                    const onClickFunc = existingCustomServingRuntime
                      ? updateServingRuntimeTemplate(
                          existingCustomServingRuntime.metadata.name,
                          code,
                          dashboardNamespace,
                        )
                      : createServingRuntimeTemplate(code, dashboardNamespace);
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
                  {existingCustomServingRuntime ? 'Update' : 'Add'}
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  isDisabled={loading}
                  variant="link"
                  id="cancel-button"
                  onClick={() => navigate(`/servingRuntimes`)}
                >
                  Cancel
                </Button>
              </ActionListItem>
            </ActionList>
          </StackItem>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};
export default CustomServingRuntimeAddTemplate;
