import * as React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import { Button, Form, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { useIlabPipeline } from '~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import MissingConditionAlert from '~/pages/pipelines/global/modelCustomization/startRunModal/MissingConditionAlert';
import {
  ContinueCondition,
  ContinueState,
} from '~/pages/pipelines/global/modelCustomization/startRunModal/types';

export type StartRunModalWrapperProps = {
  onSubmit: (selectedProject: string) => void;
  onCancel: () => void;
  selectedProject: string | null;
  setSelectedProject: (project: string) => void;
};

const StartRunModalWrapper: React.FC<StartRunModalWrapperProps> = ({
  onSubmit,
  onCancel,
  selectedProject,
  setSelectedProject,
}) => {
  const { pipelinesServer } = usePipelinesAPI();
  const [, ilabPipelineLoaded, ilabPipelineLoadError] = useIlabPipeline();

  const isLoadingProject = React.useMemo(() => {
    if (!selectedProject) {
      return false;
    }

    if (pipelinesServer.initializing) {
      return true;
    }

    return !(ilabPipelineLoaded || ilabPipelineLoadError);
  }, [pipelinesServer.initializing, selectedProject, ilabPipelineLoaded, ilabPipelineLoadError]);

  const continueState = React.useMemo<ContinueState>(() => {
    if (!selectedProject || isLoadingProject) {
      return { canContinue: false, selectedProject: null };
    }

    const requirements: [ContinueCondition, boolean][] = [
      // Order matters -- the first unmet requirement will be shown
      ['pipelineServerAccessible', pipelinesServer.installed && pipelinesServer.compatible],
      ['pipelineServerOnline', !pipelinesServer.timedOut],
      ['pipelineServerConfigured', !ilabPipelineLoadError],
      ['ilabPipelineInstalled', ilabPipelineLoaded],
    ];

    const unmetRequirements = requirements
      .filter(([, isMet]) => !isMet)
      .map(([requirement]) => requirement);

    if (unmetRequirements.length > 0) {
      return { canContinue: false, missingCondition: unmetRequirements[0], selectedProject };
    }

    return { canContinue: true, selectedProject };
  }, [
    selectedProject,
    isLoadingProject,
    pipelinesServer,
    ilabPipelineLoaded,
    ilabPipelineLoadError,
  ]);

  return (
    <Modal
      title="Start an InstructLab run"
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
          isSubmitDisabled={!continueState.canContinue}
        />
      }
      variant="medium"
      data-testid="start-run-modal"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            Fine-tune your models to improve their performance, accuracy, and task specialization,
            using the{' '}
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
            </Button>
            . Before creating a run, a taxonomy is needed and a teacher and judge model must be
            configured.{' '}
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
              Learn more about prerequisites for InstructLab fine-tuning
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
                    placeholder="Select a Data science project"
                    isLoading={isLoadingProject}
                  />
                </StackItem>
                <StackItem>The InstructLab pipeline will run in the selected project</StackItem>
                {selectedProject &&
                  !continueState.canContinue &&
                  continueState.missingCondition && (
                    <StackItem>
                      <MissingConditionAlert
                        selectedProject={selectedProject}
                        missingCondition={continueState.missingCondition}
                      />
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

export default StartRunModalWrapper;
