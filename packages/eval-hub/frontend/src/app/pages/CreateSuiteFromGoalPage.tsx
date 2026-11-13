import * as React from 'react';
import { BreadcrumbItem, PageSection, Wizard, WizardStep } from '@patternfly/react-core';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import DefineGoalStep from '~/app/components/suiteBuilder/DefineGoalStep';
import SuiteBuilderFooter from '~/app/components/suiteBuilder/SuiteBuilderFooter';
import SuiteSettingsStep from '~/app/components/suiteBuilder/SuiteSettingsStep';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';
import {
  evaluationCreateSuiteChooserRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import {
  suiteBuilderDefaultValues,
  suiteBuilderSchema,
  defineGoalFieldNames,
  defineGoalSchema,
  suiteSettingsFieldNames,
  suiteSettingsSchema,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';

import './CreateSuiteFromGoalPage.scss';

const CreateSuiteFromGoalPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const projectDisplayName = useProjectDisplayName(namespace);
  const {
    inferenceServices,
    loaded: inferenceServicesLoaded,
    loadError: inferenceServicesError,
  } = useInferenceServices(namespace ?? '');
  const methods = useForm<SuiteBuilderFormValues>({
    defaultValues: suiteBuilderDefaultValues,
    resolver: zodResolver(suiteBuilderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const [suiteName, suiteDescription] = useWatch({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
  });
  const [evaluationGoal, generatorModel] = useWatch({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  const { errors } = useFormState({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
  });
  const { errors: defineGoalErrors } = useFormState({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  const isSuiteSettingsValid = suiteSettingsSchema.safeParse({
    suiteName,
    suiteDescription,
  }).success;
  const hasSuiteSettingsErrors = suiteSettingsFieldNames.some((fieldName) => errors[fieldName]);
  const canContinueSettings = isSuiteSettingsValid && !hasSuiteSettingsErrors;
  const isDefineGoalValid = defineGoalSchema.safeParse({
    evaluationGoal,
    generatorModel,
  }).success;
  const selectedGeneratorModelIsAvailable =
    generatorModel?.source !== 'cluster' ||
    (inferenceServicesLoaded &&
      !inferenceServicesError &&
      inferenceServices.some(
        (service) =>
          service.name === generatorModel.name &&
          getGeneratorModelEndpoint(service) === generatorModel.url,
      ));
  const hasDefineGoalErrors = defineGoalFieldNames.some((fieldName) => defineGoalErrors[fieldName]);
  const canRecommend =
    canContinueSettings &&
    isDefineGoalValid &&
    selectedGeneratorModelIsAvailable &&
    !hasDefineGoalErrors;
  const cancelRoute = evaluationCreateSuiteChooserRoute(namespace);

  return (
    <ApplicationsPage
      title="Create suite"
      description="Configure your suite, describe your goal, and choose benchmarks."
      breadcrumb={
        <div className="pf-v6-u-pb-md">
          <ContextBreadcrumb
            pageName="Evaluations"
            projectDisplayName={projectDisplayName}
            homePath={evaluationsBaseRoute(namespace)}
            projectHomePath={projectHomeRoute(namespace)}
          >
            <BreadcrumbItem isActive>Create suite</BreadcrumbItem>
          </ContextBreadcrumb>
        </div>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <FormProvider {...methods}>
          <Wizard
            className="evalhub-goal-suite-wizard"
            height="100%"
            isVisitRequired
            navAriaLabel="Suite creation steps"
            footer={
              <SuiteBuilderFooter
                cancelRoute={cancelRoute}
                canContinueSettings={canContinueSettings}
                canRecommend={canRecommend}
              />
            }
          >
            <WizardStep name="Suite settings" id="suite-settings">
              <SuiteSettingsStep canContinueSettings={canContinueSettings} />
            </WizardStep>
            <WizardStep name="Define goal" id="define-goal" isDisabled={!canContinueSettings}>
              <DefineGoalStep
                inferenceServices={inferenceServices}
                inferenceServicesLoaded={inferenceServicesLoaded}
                inferenceServicesError={inferenceServicesError}
                selectedModelIsAvailable={selectedGeneratorModelIsAvailable}
                canRecommend={canRecommend}
              />
            </WizardStep>
            <WizardStep
              name="Benchmark overview"
              id="benchmark-overview"
              isDisabled={!canRecommend}
            >
              <div data-testid="benchmark-overview-step-placeholder" />
            </WizardStep>
            <WizardStep name="Review" id="review" isDisabled>
              <div data-testid="review-step-placeholder" />
            </WizardStep>
          </Wizard>
        </FormProvider>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CreateSuiteFromGoalPage;
