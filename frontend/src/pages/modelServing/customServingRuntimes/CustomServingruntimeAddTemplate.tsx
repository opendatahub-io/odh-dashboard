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
import ApplicationsPage from '~/pages/ApplicationsPage';
import { TemplateKind } from '~/k8sTypes';
import { createServingRuntimeTemplate } from '~/api';

type CustomServingRuntimesAddTemplateProps = {
  existingCustomServingRuntime?: TemplateKind;
};

const CustomServingRuntimesAddTemplate: React.FC<CustomServingRuntimesAddTemplateProps> = ({
  existingCustomServingRuntime,
}) => {
  const [code, setCode] = React.useState('');
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const navigate = useNavigate();

  return (
    <ApplicationsPage
      title="Add serving runtime"
      description="Add a new runtime that will be available for Data Science users on this cluster"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/servingRuntimes">Serving Runtimes</Link>} />
          <BreadcrumbItem isActive>Add serving runtime</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <CodeEditor
            isUploadEnabled
            isDownloadEnabled
            isCopyEnabled
            isLanguageLabelVisible
            language={Language.yaml}
            height="500px"
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
                  isDisabled={code === ''}
                  variant="primary"
                  id="create-button"
                  isLoading={loading}
                  onClick={() => {
                    setIsLoading(true);
                    createServingRuntimeTemplate(code, 'opendatahub')
                      .then(() => navigate(`/servingRuntimes`))
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
export default CustomServingRuntimesAddTemplate;
