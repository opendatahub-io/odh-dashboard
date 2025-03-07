import * as React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import { Button, Form, FormGroup, Stack, StackItem, Alert } from '@patternfly/react-core';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import MissingConditionAlert from '~/pages/pipelines/global/modelCustomization/startRunModal/MissingConditionAlert';

export type StartRunModalProps = {
  onSubmit: (selectedProject: string) => void;
  onCancel: () => void;
  loaded?: boolean;
  loadError?: Error | null;
};

const StartRunModal: React.FC<StartRunModalProps> = ({
  onSubmit,
  onCancel,
  loaded = true,
  loadError = null,
}) => {
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = React.useState<boolean>(false);
  const [canContinue, setCanContinue] = React.useState<boolean>(false);

  return (
    <Modal
      title="Start a LAB-tuning run"
      isOpen
      onClose={onCancel}
      footer={
        <DashboardModalFooter
          onSubmit={() => {
            if (selectedProject) {
              onSubmit(selectedProject);
            }
          }}
          onCancel={onCancel}
          submitLabel="Continue to run details"
          isSubmitDisabled={!canContinue || !loaded}
        />
      }
      variant="medium"
      data-testid="start-run-modal"
    >
      <Form>
        <Stack hasGutter>
          {loadError && (
            <StackItem>
              <Alert variant="danger" title="Error loading model data">
                {loadError.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            Tune a model using the{' '}
            <Button
              data-testid="lab-method"
              variant="link"
              isInline
              component="a"
              style={{ textDecoration: 'none' }}
              onClick={() => {
                // TODO: Link to documentation
              }}
            >
              LAB method
            </Button>{' '}
            with the InstructLab pipeline. To create a LAB-tuning run, you must have a taxonomy
            stored in a git repository, and a configured teacher and judge model.{' '}
          </StackItem>
          <StackItem>
            <Button
              data-testid="learn-more-prerequisites"
              variant="link"
              isInline
              component="a"
              style={{ textDecoration: 'none' }}
              onClick={() => {
                // TODO: Link to documentation
              }}
            >
              Learn more about LAB-tuning prerequisites.
            </Button>
            .
          </StackItem>
          <StackItem>
            <FormGroup
              label="Data science project"
              fieldId="start-run-modal-project-name"
              isRequired
            >
              <Stack hasGutter>
                <StackItem>
                  <ProjectSelector
                    isFullWidth
                    onSelection={(projectName) => {
                      setSelectedProject(projectName);
                    }}
                    namespace={selectedProject ?? ''}
                    placeholder="Select a project for the InstructLab pipeline to run in."
                    isLoading={isLoadingProject}
                  />
                </StackItem>
                <StackItem>The InstructLab pipeline will run in the selected project</StackItem>
                {selectedProject && (
                  <StackItem>
                    <PipelineContextProvider namespace={selectedProject}>
                      <MissingConditionAlert
                        key={selectedProject}
                        selectedProject={selectedProject}
                        setIsLoadingProject={setIsLoadingProject}
                        setCanContinue={setCanContinue}
                      />
                    </PipelineContextProvider>
                  </StackItem>
                )}
              </Stack>
            </FormGroup>
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default StartRunModal;
