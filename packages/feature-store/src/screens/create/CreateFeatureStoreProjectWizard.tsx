import React from 'react';
import {
  Wizard,
  WizardStep,
  WizardFooterWrapper,
  Button,
  ActionList,
  ActionListGroup,
  ActionListItem,
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
import { createFeatureStore } from '../../api/featureStores';
import { FeatureStoreKind } from '../../k8sTypes';
import { FeatureStoreObject } from '../../const';
import { featureStoreRoute, featureStoreDeployRoute } from '../../routes';
import useNamespaceSecrets from '../../hooks/useNamespaceSecrets';
import useNamespaceConfigMaps from '../../hooks/useNamespaceConfigMaps';
import useAccessibleNamespaces from '../../hooks/useAccessibleNamespaces';

type WizardFooterProps = {
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
};

const FeatureStoreWizardFooter: React.FC<WizardFooterProps> = ({
  isSubmitting,
  canSubmit,
  onSubmit,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;
  const nextStepDisabled = isLastStep || steps[activeStep.index]?.isDisabled;

  return (
    <WizardFooterWrapper>
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
          {isLastStep ? (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={onSubmit}
                isDisabled={!canSubmit || isSubmitting}
                isLoading={isSubmitting}
                data-testid="feast-wizard-submit"
              >
                Create feature store
              </Button>
            </ActionListItem>
          ) : (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={goToNextStep}
                isDisabled={nextStepDisabled}
                data-testid="feast-wizard-next"
              >
                Next
              </Button>
            </ActionListItem>
          )}
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close} isDisabled={isSubmitting}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
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
  const accessibleNamespaces = useAccessibleNamespaces();
  const { secrets: namespaceSecrets } = useNamespaceSecrets(data.namespace);
  const { configMaps: namespaceConfigMaps } = useNamespaceConfigMaps(data.namespace);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>();

  const hasAppliedPrefill = React.useRef(false);
  const dataRef = React.useRef(data);
  dataRef.current = data;

  React.useEffect(() => {
    if (!hasAppliedPrefill.current && hasUILabeledStore && primaryStore) {
      hasAppliedPrefill.current = true;
      setData('registryType', RegistryType.REMOTE);
      setData('remoteRegistryType', RemoteRegistryType.FEAST_REF);
      setData('services', {
        ...dataRef.current.services,
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
  }, [hasUILabeledStore, primaryStore, setData]);

  const validation = validateFeatureStoreForm(data, existingProjectNames);
  const canSubmit = isFormValid(validation);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const formSpec = buildFormSpec(data, !hasUILabeledStore);
      const created = await createFeatureStore(formSpec);
      navigate(featureStoreDeployRoute(created.metadata.namespace, created.metadata.name));
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, data, hasUILabeledStore, navigate]);

  const wizardFooter = (
    <FeatureStoreWizardFooter
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
    />
  );

  return (
    <div data-testid="feast-create-wizard">
      <Wizard
        onClose={() => navigate(featureStoreRoute(FeatureStoreObject.OVERVIEW))}
        footer={wizardFooter}
      >
        <WizardStep name="Details" id="project-basics-step">
          <ProjectBasicsStep
            data={data}
            setData={setData}
            existingProjectNames={existingProjectNames}
            namespaceSecrets={namespaceSecrets}
            accessibleNamespaces={accessibleNamespaces}
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
          <AdvancedStep
            data={data}
            setData={setData}
            namespaceSecrets={namespaceSecrets}
            namespaceConfigMaps={namespaceConfigMaps}
          />
        </WizardStep>
        <WizardStep name="Review" id="review-step" isDisabled={!canSubmit}>
          <ReviewStep
            data={data}
            validation={validation}
            submitError={submitError}
            hasUILabeledStore={hasUILabeledStore}
          />
        </WizardStep>
      </Wizard>
    </div>
  );
};

export default CreateFeatureStoreProjectWizard;
