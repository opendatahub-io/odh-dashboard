import * as React from 'react';
import {
  BreadcrumbItem,
  Content,
  PageSection,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
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
  suiteSettingsFieldNames,
  suiteSettingsSchema,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';

import './CreateSuiteFromGoalPage.scss';

const CreateSuiteFromGoalPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const projectDisplayName = useProjectDisplayName(namespace);
  const { providers, loaded, loadError } = useProviders(namespace ?? '');
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
  const { errors } = useFormState({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
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
              <div data-testid="define-goal-step-placeholder">
                <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
                  Define goal
                </Title>
                <Content component="p">
                  Describe the model evaluation goal you want to measure.
                </Content>
              </div>
            </WizardStep>
            <WizardStep name="Benchmark overview" id="benchmark-overview" isDisabled>
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
