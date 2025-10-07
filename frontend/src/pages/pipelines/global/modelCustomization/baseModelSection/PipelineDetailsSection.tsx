import React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  Skeleton,
  Stack,
  StackItem,
  HelperTextItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ZodIssue } from 'zod';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { createRunRoute } from '#~/routes/pipelines/runs';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import FormSection from '#~/components/pf-overrides/FormSection';

type PipelineDetailsSectionProps = {
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
  ilabPipelineLoaded: boolean;
  zodValidationIssues: ZodIssue[];
};

export const PipelineDetailsSection: React.FC<PipelineDetailsSectionProps> = ({
  ilabPipeline,
  ilabPipelineVersion,
  ilabPipelineLoaded,
  zodValidationIssues,
}) => {
  const { namespace } = usePipelinesAPI();
  const navigate = useNavigate();
  const hasValidationErrors = zodValidationIssues.length > 0;

  return (
    <FormSection
      id={FineTunePageSections.PIPELINE_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.PIPELINE_DETAILS]}
      description="InstructLab's pipeline automates the LAB tuning process, facilitating efficient
        fine-tuning of large language models and enabling scalable utilization of compute resources."
    >
      {ilabPipelineLoaded ? (
        <>
          <FormGroup label="Pipeline name" fieldId="pipeline-name" isRequired>
            <div data-testid="pipeline-name">{ilabPipeline?.display_name ?? '-'}</div>
          </FormGroup>
          <FormGroup label="Pipeline version" fieldId="pipeline-version" isRequired>
            <Stack hasGutter>
              <StackItem data-testid="pipeline-version">
                {ilabPipelineVersion?.display_name ?? '-'}
              </StackItem>
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
                        <ExpandableSection toggleText="View compatibility errors">
                          <FormHelperText>
                            <HelperText>
                              {zodValidationIssues.map((issue) => (
                                <HelperTextItem variant="error" key={issue.path.join('.')}>
                                  {issue.message}
                                </HelperTextItem>
                              ))}
                            </HelperText>
                          </FormHelperText>
                        </ExpandableSection>
                      </StackItem>
                      <StackItem>
                        <ActionList>
                          <ActionListItem>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => {
                                navigate(createRunRoute(namespace), {
                                  state: {
                                    contextData: {
                                      pipeline: ilabPipeline,
                                      version: ilabPipelineVersion,
                                    },
                                  },
                                });
                              }}
                            >
                              Use the <b>Create run</b> form
                            </Button>
                          </ActionListItem>
                          <ActionListItem>
                            <Button
                              variant="link"
                              isInline
                              onClick={() => navigate('/develop-train/pipelines/definitions')}
                            >
                              Go to <b>Pipeline definitions</b>
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
