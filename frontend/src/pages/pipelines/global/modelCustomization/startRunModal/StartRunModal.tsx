import * as React from 'react';
import { Modal } from '@patternfly/react-core/deprecated';
import {
  Alert,
  Content,
  ContentVariants,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ProjectSelector from '#~/concepts/projects/ProjectSelector';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { PipelineContextProvider } from '#~/concepts/pipelines/context';
import MissingConditionAlert from '#~/pages/pipelines/global/modelCustomization/startRunModal/MissingConditionAlert';
import { modelCustomizationRootPath } from '#~/routes/pipelines/modelCustomization';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

export type StartRunModalProps = {
  onSubmit: (selectedProject: string) => void;
  onCancel: () => void;
  loaded?: boolean;
  loadError?: Error | null;
};

const eventName = 'Lab Tune requested';
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
      isOpen
      onClose={onCancel}
      footer={
        <DashboardModalFooter
          onSubmit={() => {
            if (selectedProject) {
              fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.submit });
              onSubmit(selectedProject);
            }
          }}
          onCancel={() => {
            fireFormTrackingEvent(eventName, {
              outcome: TrackingOutcome.cancel,
              couldContinue: canContinue,
            });
            onCancel();
          }}
          submitLabel="Continue to run details"
          isSubmitDisabled={!canContinue || !loaded || !!loadError}
        />
      }
      variant={ModalVariant.medium}
      hasNoBodyWrapper
    >
      <ModalHeader
        title="Start a LAB-tuning run"
        description={
          <>
            <Content component={ContentVariants.p}>
              Tune a model using the LAB method with the InstructLab pipeline. To create a
              LAB-tuning run, you must have a taxonomy stored in a git repository, and a configured
              teacher and judge model.
            </Content>
            <Link to={modelCustomizationRootPath}>Learn more about LAB-tuning prerequisites</Link>.
          </>
        }
      />
      <ModalBody data-testid="start-run-modal">
        {loadError && (
          <Alert variant="danger" title="Error loading model data" className="pf-v6-u-mb-md">
            {loadError.message}
          </Alert>
        )}
        <Form>
          <FormGroup
            label="Data science project"
            fieldId="start-run-modal-project-name"
            isRequired
            labelHelp={
              <HelperText>
                <HelperTextItem>
                  Select a project for the InstructLab pipeline to run in.
                </HelperTextItem>
              </HelperText>
            }
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
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      The InstructLab pipeline will run in the selected project
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </StackItem>
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
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default StartRunModal;
