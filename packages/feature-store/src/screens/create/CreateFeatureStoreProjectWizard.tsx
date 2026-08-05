import React from 'react';
import {
  Content,
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
import { validateFeatureStoreForm } from './validationUtils';
import useCreateFeatureStoreProjectState from './useCreateFeatureStoreProjectState';
import ProjectBasicsStep from './steps/ProjectBasicsStep';
import RegistryStep from './steps/RegistryStep';
import { FeatureStoreKind } from '../../k8sTypes';
import { FeatureStoreObject } from '../../const';
import { featureStoreRoute } from '../../routes';
import useNamespaceSecrets from '../../hooks/useNamespaceSecrets';
import useNamespaceConfigMaps from '../../hooks/useNamespaceConfigMaps';

const FeatureStoreWizardFooter: React.FC = () => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;
  const nextStepDisabled = isLastStep || steps[activeStep.index]?.isDisabled;

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="secondary" onClick={goToPrevStep} isDisabled={isFirstStep}>
              Back
            </Button>
          </ActionListItem>
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
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

const PlaceholderStepBody: React.FC<{ stepName: string }> = ({ stepName }) => (
  <Content>
    <Content component="p">{stepName} configuration will be available in a future update.</Content>
  </Content>
);

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

  const wizardFooter = <FeatureStoreWizardFooter />;

  return (
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
      <WizardStep name="Online & offline stores" id="store-config-step" isDisabled>
        <PlaceholderStepBody stepName="Online & offline stores" />
      </WizardStep>
      <WizardStep name="Advanced options" id="advanced-step" isDisabled>
        <PlaceholderStepBody stepName="Advanced options" />
      </WizardStep>
      <WizardStep name="Review" id="review-step" isDisabled>
        <PlaceholderStepBody stepName="Review" />
      </WizardStep>
    </Wizard>
  );
};

export default CreateFeatureStoreProjectWizard;
