import React from 'react';
import { Button, FormGroup, Radio } from '@patternfly/react-core';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
  teacherJudgeMarkdownContent,
  teacherJudgeMarkdownTitle,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationEndpointType } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';
import {
  JudgeEndpointInput,
  JudgeModelNameInput,
  JudgeTokenInput,
} from '#~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherJudgeInputComponents';
import {
  TeacherJudgeFormData,
  teacherJudgeModel,
} from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ModelCustomizationDrawerContentArgs } from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '#~/components/MarkdownView';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import FormSection from '#~/components/pf-overrides/FormSection';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';

type JudgeModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const JudgeModelSection: React.FC<JudgeModelSectionProps> = ({
  data,
  setData,
  handleOpenDrawer,
}) => {
  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    data,
    teacherJudgeModel,
  );

  return (
    <FormSection
      id={FineTunePageSections.JUDGE_MODEL}
      title={fineTunePageSectionTitles[FineTunePageSections.JUDGE_MODEL]}
      description={
        <>
          Enter the URL endpoint of the judge model to deploy for use in synthetic data generation
          (SDG).{' '}
          <Button
            style={{ padding: 0 }}
            variant="link"
            onClick={() =>
              handleOpenDrawer({
                title: teacherJudgeMarkdownTitle,
                content: <MarkdownView markdown={teacherJudgeMarkdownContent} />,
              })
            }
          >
            Learn more about how to deploy a judge model
          </Button>
        </>
      }
      data-testid={FineTunePageSections.JUDGE_MODEL}
    >
      <FormGroup label="Judge" fieldId="model-customization-judge" isRequired>
        <Radio
          name="judge-section-unauthenticated-endpoint-radio"
          id="judge-section-unauthenticated-endpoint-radio"
          label="Unauthenticated endpoint"
          className="pf-v6-u-mb-md"
          isChecked={data.endpointType === ModelCustomizationEndpointType.PUBLIC}
          onChange={() => {
            setData({
              ...data,
              endpointType: ModelCustomizationEndpointType.PUBLIC,
            });
          }}
          body={
            data.endpointType === ModelCustomizationEndpointType.PUBLIC && (
              <>
                <JudgeEndpointInput
                  value={data.endpoint}
                  setValue={(value) => setData({ ...data, endpoint: value })}
                  {...getFieldValidationProps(['endpoint'])}
                />
                <ZodErrorHelperText zodIssue={getFieldValidation(['endpoint'])} />
                <JudgeModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  {...getFieldValidationProps(['modelName'])}
                />
                <ZodErrorHelperText zodIssue={getFieldValidation(['modelName'])} />
              </>
            )
          }
        />
        <Radio
          name="judge-section-authenticated-endpoint-radio"
          id="judge-section-authenticated-endpoint-radio"
          label="Authenticated endpoint"
          isChecked={data.endpointType === ModelCustomizationEndpointType.PRIVATE}
          onChange={() => {
            setData({
              ...data,
              endpointType: ModelCustomizationEndpointType.PRIVATE,
              apiToken: data.apiToken ?? '',
            });
          }}
          body={
            data.endpointType === ModelCustomizationEndpointType.PRIVATE && (
              <>
                <JudgeEndpointInput
                  value={data.endpoint}
                  setValue={(value) => setData({ ...data, endpoint: value })}
                  {...getFieldValidationProps(['endpoint'])}
                />
                <ZodErrorHelperText zodIssue={getFieldValidation(['endpoint'])} />
                <JudgeTokenInput
                  value={data.apiToken}
                  setValue={(value) => setData({ ...data, apiToken: value })}
                  {...getFieldValidationProps(['apiToken'])}
                />
                <ZodErrorHelperText zodIssue={getFieldValidation(['apiToken'])} />
                <JudgeModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  {...getFieldValidationProps(['modelName'])}
                />
                <ZodErrorHelperText zodIssue={getFieldValidation(['modelName'])} />
              </>
            )
          }
        />
      </FormGroup>
    </FormSection>
  );
};

export default JudgeModelSection;
