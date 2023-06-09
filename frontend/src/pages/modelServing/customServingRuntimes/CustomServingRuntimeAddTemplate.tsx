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
import { getServingRuntimeDisplayNameFromTemplate } from './utils';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type CustomServingRuntimeAddTemplateProps = {
  existingTemplate?: TemplateKind;
};

const CustomServingRuntimeAddTemplate: React.FC<CustomServingRuntimeAddTemplateProps> = ({
  existingTemplate,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { refreshData } = React.useContext(CustomServingRuntimeContext);
  const { state } = useLocation();

  const stringifiedTemplate = existingTemplate
    ? YAML.stringify(existingTemplate.objects[0])
    : state
    ? YAML.stringify(state.template)
    : '';
  const [code, setCode] = React.useState(stringifiedTemplate);
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const navigate = useNavigate();

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
          : 'Add a new runtime that will be available for Data Science users on this cluster.'
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
      <Stack hasGutter>
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
              title="Error"
              actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
            >
              <p>{error.message}</p>
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <ActionList>
            <ActionListItem>
              <Button
                isDisabled={code === stringifiedTemplate || code === '' || loading}
                variant="primary"
                id="create-button"
                isLoading={loading}
                onClick={() => {
                  setIsLoading(true);
                  // TODO: Revert back to pass through api once we migrate admin panel
                  const onClickFunc = existingTemplate
                    ? updateServingRuntimeTemplateBackend(
                        existingTemplate.metadata.name,
                        existingTemplate.objects[0].metadata.name,
                        code,
                        dashboardNamespace,
                      )
                    : createServingRuntimeTemplateBackend(code, dashboardNamespace);
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
      </Stack>
    </ApplicationsPage>
  );
};
export default CustomServingRuntimeAddTemplate;
