import React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  FormGroup,
  FormSection,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '~/pages/pipelines/global/modelCustomization/const';
import { createRunRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';

type PipelineDetailsSectionProps = {
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
  ilabPipelineLoaded: boolean;
  hasValidationErrors: boolean;
};

export const PipelineDetailsSection: React.FC<PipelineDetailsSectionProps> = ({
  ilabPipeline,
  ilabPipelineVersion,
  ilabPipelineLoaded,
  hasValidationErrors,
}) => {
  const { namespace } = usePipelinesAPI();
  const navigate = useNavigate();

  return (
    //TODO: Pipeline description https://issues.redhat.com/browse/RHOAIENG-19187
    <FormSection
      id={FineTunePageSections.PIPELINE_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.PIPELINE_DETAILS]}
    >
      {ilabPipelineLoaded ? (
        <>
          <FormGroup label="Pipeline name" fieldId="pipeline-name" isRequired>
            {ilabPipeline?.display_name ?? '-'}
          </FormGroup>
          <FormGroup label="Pipeline version" fieldId="pipeline-version" isRequired>
            <Stack hasGutter>
              <StackItem>{ilabPipelineVersion?.display_name ?? '-'}</StackItem>
              <StackItem>
                {hasValidationErrors && (
                  <Alert
                    data-testid="pipeline-error-message"
                    variant="danger"
                    isInline
                    title="This pipeline version is not compatible with this form."
                  >
                    <Stack hasGutter>
                      <StackItem>
                        The latest version of the <b>{ilabPipeline?.display_name ?? ''}</b> pipeline
                        is not compatible with the <b>Start an InstructLab run</b> form. To create a
                        run for this version, use the <b>Create run</b> form. Alternatively, manage
                        this pipeline&apos;s versions in the <b>Pipelines</b> page for this project.
                      </StackItem>
                      <StackItem>
                        <ActionList>
                          <ActionListItem>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => {
                                navigate(createRunRoute(namespace), {
                                  state: { contextData: { ilabPipeline, ilabPipelineVersion } },
                                });
                              }}
                            >
                              Use the <b>Create run</b> form
                            </Button>
                          </ActionListItem>
                          <ActionListItem>
                            <Button variant="link" isInline onClick={() => navigate('/pipelines')}>
                              Go to <b>Pipelines</b>
                            </Button>
                          </ActionListItem>
                        </ActionList>
                      </StackItem>
                    </Stack>
                  </Alert>
                )}
              </StackItem>
            </Stack>
          </FormGroup>
        </>
      ) : (
        <Skeleton />
      )}
    </FormSection>
  );
};
