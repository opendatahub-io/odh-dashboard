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
  TeacherEndpointInput,
  TeacherModelNameInput,
  TeacherTokenInput,
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

type TeacherModelSectionProps = {
  data: TeacherJudgeFormData;
  setData: (data: TeacherJudgeFormData) => void;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const TeacherModelSection: React.FC<TeacherModelSectionProps> = ({
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
      id={FineTunePageSections.TEACHER_MODEL}
      title={fineTunePageSectionTitles[FineTunePageSections.TEACHER_MODEL]}
      description={
        <>
          Enter the URL endpoint of the teacher model to deploy for use in synthetic data generation
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
            Learn more about how to deploy a teacher model
          </Button>
        </>
      }
      data-testid={FineTunePageSections.TEACHER_MODEL}
    >
      <FormGroup label="Teacher" fieldId="model-customization-teacher" isRequired>
        <Radio
          name="teacher-section-unauthenticated-endpoint-radio"
          id="teacher-section-unauthenticated-endpoint-radio"
          data-testid="teacher-section-unauthenticated-endpoint-radio"
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
                <TeacherEndpointInput
                  value={data.endpoint}
                  setValue={(value) => setData({ ...data, endpoint: value })}
                  {...getFieldValidationProps(['endpoint'])}
                />
                <ZodErrorHelperText
                  data-testid="teacher-endpoint-input-error"
                  zodIssue={getFieldValidation(['endpoint'])}
                />
                <TeacherModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  {...getFieldValidationProps(['modelName'])}
                />
                <ZodErrorHelperText
                  data-testid="teacher-model-name-input-error"
                  zodIssue={getFieldValidation(['modelName'])}
                />
              </>
            )
          }
        />
        <Radio
          name="teacher-section-authenticated-endpoint-radio"
          id="teacher-section-authenticated-endpoint-radio"
          data-testid="teacher-section-authenticated-endpoint-radio"
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
                <TeacherEndpointInput
                  value={data.endpoint}
                  setValue={(value) => setData({ ...data, endpoint: value })}
                  {...getFieldValidationProps(['endpoint'])}
                />
                <ZodErrorHelperText
                  data-testid="teacher-endpoint-input-error"
                  zodIssue={getFieldValidation(['endpoint'])}
                />
                <TeacherTokenInput
                  value={data.apiToken}
                  setValue={(value) => setData({ ...data, apiToken: value })}
                  {...getFieldValidationProps(['apiToken'])}
                />
                <ZodErrorHelperText
                  data-testid="teacher-token-input-error"
                  zodIssue={getFieldValidation(['apiToken'])}
                />
                <TeacherModelNameInput
                  value={data.modelName}
                  setValue={(value) => setData({ ...data, modelName: value })}
                  {...getFieldValidationProps(['modelName'])}
                />
                <ZodErrorHelperText
                  data-testid="teacher-model-name-input-error"
                  zodIssue={getFieldValidation(['modelName'])}
                />
              </>
            )
          }
        />
      </FormGroup>
    </FormSection>
  );
};

export default TeacherModelSection;
