import * as React from 'react';
import { Content, ContentVariants, Form, FormGroup, FormSection } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import {
  FineTuneTaxonomyFormData,
  ModelCustomizationFormData,
  pipelineParameterSchema,
} from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import FineTunePageFooter from '~/pages/pipelines/global/modelCustomization/FineTunePageFooter';
import BaseModelSection from '~/pages/pipelines/global/modelCustomization/baseModelSection/BaseModelSection';
import TeacherModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/TeacherModelSection';
import JudgeModelSection from '~/pages/pipelines/global/modelCustomization/teacherJudgeSection/JudgeModelSection';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { ModelCustomizationRouterState } from '~/routes';
import RunTypeSection from '~/pages/pipelines/global/modelCustomization/RunTypeSection';
import FineTunedModelSection from '~/pages/pipelines/global/modelCustomization/fineTunedModelSection/FineTunedModelSection';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import { FineTunedModelNewConnectionContextProvider } from '~/pages/pipelines/global/modelCustomization/fineTunedModelSection/FineTunedModelNewConnectionContext';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import { RunTypeOption } from '~/concepts/pipelines/content/createRun/types';
import { FineTuneTaxonomySection } from './FineTuneTaxonomySection';
import TrainingHardwareSection from './trainingHardwareSection/TrainingHardwareSection';
import { FineTunePageSections, fineTunePageSectionTitles } from './const';
import HyperparameterPageSection from './HyperparameterSection/HyperparameterPageSection';
import { filterHyperparameters } from './utils';
import { PipelineDetailsSection } from './baseModelSection/PipelineDetailsSection';

type FineTunePageProps = {
  canSubmit: boolean;
  onSuccess: (runId: string, runType: RunTypeOption) => void;
  data: ModelCustomizationFormData;
  ilabPipelineLoaded: boolean;
  setData: UpdateObjectAtPropAndValue<ModelCustomizationFormData>;
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

const FineTunePage: React.FC<FineTunePageProps> = ({
  canSubmit,
  ilabPipelineLoaded,
  onSuccess,
  data,
  setData,
  ilabPipeline,
  ilabPipelineVersion,
  handleOpenDrawer,
}) => {
  const { project } = usePipelinesAPI();
  const { state }: { state?: ModelCustomizationRouterState } = useLocation();
  const { hyperparameters } = filterHyperparameters(ilabPipelineVersion);
  const [connectionTypes] = useWatchConnectionTypes();
  const ociConnectionType = React.useMemo(
    () => connectionTypes.find((c) => c.metadata.name === 'oci-v1'),
    [connectionTypes],
  );

  const invalidParameters = React.useMemo(() => {
    const parameters = getInputDefinitionParams(ilabPipelineVersion);
    const result = pipelineParameterSchema.safeParse(parameters ?? {});
    return result.error?.issues ?? [];
  }, [ilabPipelineVersion]);

  return (
    <FineTunedModelNewConnectionContextProvider connectionType={ociConnectionType}>
      <Form data-testid="fineTunePageForm" maxWidth="800px">
        <FormSection
          id={FineTunePageSections.PROJECT_DETAILS}
          title={fineTunePageSectionTitles[FineTunePageSections.PROJECT_DETAILS]}
        >
          <Content component={ContentVariants.small}>
            The project where your pipeline will run.
          </Content>
          <FormGroup
            label="Data science project"
            fieldId="model-customization-projectName"
            isRequired
          >
            <div>{getDisplayNameFromK8sResource(project)}</div>
          </FormGroup>
        </FormSection>
        <PipelineDetailsSection
          ilabPipeline={ilabPipeline}
          ilabPipelineLoaded={ilabPipelineLoaded}
          ilabPipelineVersion={ilabPipelineVersion}
          zodValidationIssues={invalidParameters}
        />

        {invalidParameters.length === 0 && (
          <>
            <BaseModelSection
              data={data.baseModel}
              setData={(baseModelData) => setData('baseModel', baseModelData)}
              registryName={state?.modelRegistryDisplayName}
              inputModelName={state?.registeredModelName}
              inputModelVersionName={state?.modelVersionName}
            />
            <FineTuneTaxonomySection
              data={data.taxonomy}
              setData={(dataTaxonomy: FineTuneTaxonomyFormData) => {
                setData('taxonomy', dataTaxonomy);
              }}
              handleOpenDrawer={handleOpenDrawer}
            />
            <TeacherModelSection
              data={data.teacher}
              setData={(teacherData) => setData('teacher', teacherData)}
              handleOpenDrawer={handleOpenDrawer}
            />
            <JudgeModelSection
              data={data.judge}
              setData={(judgeData) => setData('judge', judgeData)}
              handleOpenDrawer={handleOpenDrawer}
            />
            <RunTypeSection data={data} setData={setData} />
            <TrainingHardwareSection
              ilabPipelineLoaded={ilabPipelineLoaded}
              ilabPipelineVersion={ilabPipelineVersion}
              trainingNode={data.trainingNode}
              setTrainingNode={(trainingNodeValue: number) =>
                setData('trainingNode', trainingNodeValue)
              }
              storageClass={data.storageClass}
              setStorageClass={(storageClassName: string) =>
                setData('storageClass', storageClassName)
              }
              setHardwareFormData={(hardwareFormData) => setData('hardware', hardwareFormData)}
            />
            <HyperparameterPageSection
              data={data}
              hyperparameters={hyperparameters}
              setData={setData}
            />
            <FineTunedModelSection
              data={data.outputModel}
              setData={(outputModelData) => setData('outputModel', outputModelData)}
              connectionTypes={connectionTypes}
            />
          </>
        )}
        <FormSection>
          <FineTunePageFooter
            ociConnectionType={ociConnectionType}
            canSubmit={canSubmit}
            onSuccess={onSuccess}
            data={data}
            ilabPipeline={ilabPipeline}
            ilabPipelineVersion={ilabPipelineVersion}
          />
        </FormSection>
      </Form>
    </FineTunedModelNewConnectionContextProvider>
  );
};

export default FineTunePage;
