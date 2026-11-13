import * as React from 'react';
import { BreadcrumbItem, PageSection, Wizard, WizardStep } from '@patternfly/react-core';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import DefineGoalStep from '~/app/components/suiteBuilder/DefineGoalStep';
import { getCategoryOptions } from '~/app/components/suiteBuilder/CategoryField';
import SuiteBuilderFooter from '~/app/components/suiteBuilder/SuiteBuilderFooter';
import SuiteSettingsStep from '~/app/components/suiteBuilder/SuiteSettingsStep';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useProviders } from '~/app/hooks/useProviders';
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
import useRecommendationModelProfiles from '~/app/hooks/useRecommendationModelProfiles';
import type { RecommendationModelProfile } from '~/app/types';

import './CreateSuiteFromGoalPage.scss';

const EMPTY_RECOMMENDATION_MODELS: RecommendationModelProfile[] = [];

const CreateSuiteFromGoalPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const projectDisplayName = useProjectDisplayName(namespace);
  const { providers, loaded, loadError } = useProviders(namespace ?? '');
  const { data: recommendationModels = EMPTY_RECOMMENDATION_MODELS } =
    useRecommendationModelProfiles(namespace);
  const categoryOptions = React.useMemo(() => getCategoryOptions(providers), [providers]);
  const methods = useForm<SuiteBuilderFormValues>({
    defaultValues: suiteBuilderDefaultValues,
    resolver: zodResolver(suiteBuilderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const [suiteName, suiteDescription, suiteDomains] = useWatch({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
  });
  const [evaluationGoal, generatorModelId] = useWatch({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  React.useEffect(() => {
    if (!generatorModelId) {
      const defaultModel = recommendationModels.find((model) => model.isDefault);
      if (defaultModel) {
        methods.setValue('generatorModelId', defaultModel.id, {
          shouldValidate: true,
        });
      }
    }
  }, [generatorModelId, methods, recommendationModels]);
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
    suiteDomains,
  }).success;
  const hasSuiteSettingsErrors = suiteSettingsFieldNames.some((fieldName) => errors[fieldName]);
  const canContinueSettings =
    loaded &&
    loadError === undefined &&
    categoryOptions.length > 0 &&
    isSuiteSettingsValid &&
    !hasSuiteSettingsErrors;
  const isDefineGoalValid = defineGoalSchema.safeParse({
    evaluationGoal,
    generatorModelId,
  }).success;
  const hasDefineGoalErrors = defineGoalFieldNames.some((fieldName) => defineGoalErrors[fieldName]);
  const canRecommend =
    canContinueSettings &&
    isDefineGoalValid &&
    recommendationModels.some((model) => model.id === generatorModelId) &&
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
              <SuiteSettingsStep
                categoryOptions={categoryOptions}
                categoriesLoaded={loaded}
                categoryLoadError={loadError}
                canContinueSettings={canContinueSettings}
              />
            </WizardStep>
            <WizardStep name="Define goal" id="define-goal" isDisabled={!canContinueSettings}>
              <DefineGoalStep
                recommendationModels={recommendationModels}
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
