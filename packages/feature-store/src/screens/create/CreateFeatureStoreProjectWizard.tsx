import React from 'react';
import {
  Wizard,
  WizardStep,
  WizardFooterWrapper,
  Alert,
  Button,
  ActionList,
  ActionListGroup,
  ActionListItem,
  Stack,
  StackItem,
  useWizardContext,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { RegistryType, RemoteRegistryType } from './types';
import { validateFeatureStoreForm, isFormValid } from './validationUtils';
import { buildFormSpec } from './utils';
import useCreateFeatureStoreProjectState from './useCreateFeatureStoreProjectState';
import ProjectBasicsStep from './steps/ProjectBasicsStep';
import RegistryStep from './steps/RegistryStep';
import StoreConfigStep from './steps/StoreConfigStep';
import AdvancedStep from './steps/AdvancedStep';
import ReviewStep from './steps/ReviewStep';
import { FeatureStoreKind } from '../../k8sTypes';
import { createFeatureStore } from '../../api/featureStores';
import useNamespaceSecrets from '../../hooks/useNamespaceSecrets';
import useNamespaceConfigMaps from '../../hooks/useNamespaceConfigMaps';

type FeatureStoreWizardFooterProps = {
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  submitError?: string;
  onSubmit: () => void;
};

const FeatureStoreWizardFooter: React.FC<FeatureStoreWizardFooterProps> = ({
  isSubmitting,
  isSubmitDisabled,
  submitError,
  onSubmit,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFinalStep = activeStep.index === steps.length;
  const isFirstStep = activeStep.index === 1;
  const nextStepDisabled = steps[activeStep.index]?.isDisabled;

  return (
    <WizardFooterWrapper>
      <Stack hasGutter>
        {submitError && (
          <StackItem>
            <Alert variant="danger" isInline title="Failed to create feature store">
              {submitError}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <ActionList>
            <ActionListGroup>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isFirstStep || isSubmitting}
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                {isFinalStep ? (
                  <Button
                    variant="primary"
                    onClick={onSubmit}
                    isLoading={isSubmitting}
                    isDisabled={isSubmitDisabled || isSubmitting}
                    data-testid="feast-create-submit"
                  >
                    Create feature store
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={goToNextStep}
                    isDisabled={nextStepDisabled}
                    data-testid="feast-wizard-next"
                  >
                    Next
                  </Button>
                )}
              </ActionListItem>
            </ActionListGroup>
            <ActionListGroup>
              <ActionListItem>
                <Button variant="link" onClick={close} isDisabled={isSubmitting}>
                  Cancel
                </Button>
              </ActionListItem>
            </ActionListGroup>
          </ActionList>
        </StackItem>
      </Stack>
    </WizardFooterWrapper>
  );
};

type CreateFeatureStoreProjectWizardProps = {
  existingProjectNames: string[];
  hasUILabeledStore: boolean;
  primaryStore: FeatureStoreKind | undefined;
};

const CreateFeatureStoreProjectWizard: React.FC<CreateFeatureStoreProjectWizardProps> = ({
  existingProjectNames,
  hasUILabeledStore,
  primaryStore,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useCreateFeatureStoreProjectState();
  const { secrets: namespaceSecrets } = useNamespaceSecrets(data.namespace);
  const { configMaps: namespaceConfigMaps } = useNamespaceConfigMaps(data.namespace);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (hasUILabeledStore && primaryStore) {
      setData('registryType', RegistryType.REMOTE);
      setData('remoteRegistryType', RemoteRegistryType.FEAST_REF);
      setData('services', {
        ...data.services,
        registry: {
          remote: {
            feastRef: {
              name: primaryStore.metadata.name,
              namespace: primaryStore.metadata.namespace,
            },
          },
        },
      });
    }
    // Only on mount when existing stores change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUILabeledStore]);

  const validation = validateFeatureStoreForm(data, existingProjectNames);
  const allValid = isFormValid(validation);

  const handleSubmit = async () => {
    if (!allValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const formSpec = buildFormSpec(data, !hasUILabeledStore);
      await createFeatureStore(formSpec);
      navigate(
        `/develop-train/feature-store/create/deploy/${formSpec.namespace}/${formSpec.feastProject}`,
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const wizardFooter = (
    <FeatureStoreWizardFooter
      isSubmitting={isSubmitting}
      isSubmitDisabled={!allValid}
      submitError={submitError}
      onSubmit={handleSubmit}
    />
  );

  return (
    <Wizard
      onClose={() => navigate('/develop-train/feature-store/overview')}
      onSave={handleSubmit}
      footer={wizardFooter}
    >
      <WizardStep name="Basics" id="project-basics-step">
        <ProjectBasicsStep
          data={data}
          setData={setData}
          existingProjectNames={existingProjectNames}
          namespaceSecrets={namespaceSecrets}
        />
      </WizardStep>
      <WizardStep name="Registry" id="registry-step" isDisabled={!validation.projectBasics.valid}>
        <RegistryStep
          data={data}
          setData={setData}
          hasUILabeledStore={hasUILabeledStore}
          primaryStore={primaryStore}
          namespaceSecrets={namespaceSecrets}
          namespaceConfigMaps={namespaceConfigMaps}
        />
      </WizardStep>
      <WizardStep
        name="Online & offline stores"
        id="store-config-step"
        isDisabled={!validation.projectBasics.valid || !validation.registry.valid}
      >
        <StoreConfigStep data={data} setData={setData} namespaceSecrets={namespaceSecrets} />
      </WizardStep>
      <WizardStep
        name="Advanced options"
        id="advanced-step"
        isDisabled={
          !validation.projectBasics.valid ||
          !validation.registry.valid ||
          !validation.storeConfig.valid
        }
      >
        <AdvancedStep data={data} setData={setData} namespaceConfigMaps={namespaceConfigMaps} />
      </WizardStep>
      <WizardStep name="Review" id="review-step" isDisabled={!allValid}>
        <ReviewStep data={data} isFirstProject={!hasUILabeledStore} />
      </WizardStep>
    </Wizard>
  );
};

export default CreateFeatureStoreProjectWizard;
