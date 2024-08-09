import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useParams, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import {
  modelRegistryUrl,
  modelVersionUrl,
  registeredModelUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import {
  filterLiveModels,
  filterLiveVersions,
  getLastCreatedItem,
  uriToObjectStorageFields,
} from '~/concepts/modelRegistry/utils';
import { ValueOf } from '~/typeHelpers';
import {
  ModelLocationType,
  RegistrationCommonFormData,
  useRegisterVersionData,
} from './useRegisterModelData';
import { isRegisterVersionSubmitDisabled, registerVersion } from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import { useRegistrationCommonState } from './useRegistrationCommonState';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import RegisteredModelSelector from './RegisteredModelSelector';

const RegisterVersion: React.FC = () => {
  const { modelRegistry: mrName, registeredModelId: prefilledRegisteredModelId } = useParams();

  const navigate = useNavigate();

  const { isSubmitting, submitError, setSubmitError, handleSubmit, apiState, author } =
    useRegistrationCommonState();

  const [formData, setData] = useRegisterVersionData(prefilledRegisteredModelId);
  const isSubmitDisabled = isSubmitting || isRegisterVersionSubmitDisabled(formData);
  const { registeredModelId } = formData;

  // TODO factor out all this fetching into a hook?
  const [allRegisteredModels, loadedRegisteredModels, loadRegisteredModelsError] =
    useRegisteredModels();
  const liveRegisteredModels = filterLiveModels(allRegisteredModels.items);
  const registeredModel = liveRegisteredModels.find(({ id }) => id === registeredModelId);

  const [allModelVersions, loadedModelVersions, loadModelVersionsError] =
    useModelVersionsByRegisteredModel(registeredModel?.id);
  const liveModelVersions = filterLiveVersions(allModelVersions.items);
  const latestVersion = getLastCreatedItem(liveModelVersions);

  const [modelArtifacts, loadedModelArtifacts, loadModelArtifactsError] =
    useModelArtifactsByVersionId(latestVersion?.id);
  const latestArtifact = getLastCreatedItem(modelArtifacts.items);

  // We don't care about artifact loading state if there is no version
  const isLoadingVersionOrArtifact =
    registeredModel && (!loadedModelVersions || (latestVersion && !loadedModelArtifacts));

  // TODO factor this out into its own hook?
  // Prefill fields from latest artifact if present. Repeat if selected model changes.
  const prefilledForModelId = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (registeredModelId !== prefilledForModelId.current && !isLoadingVersionOrArtifact) {
      prefilledForModelId.current = registeredModelId;
      if (latestArtifact) {
        setData('sourceModelFormat', latestArtifact.modelFormatName || '');
        setData('sourceModelFormatVersion', latestArtifact.modelFormatVersion || '');

        const decodedUri =
          (latestArtifact.uri && uriToObjectStorageFields(latestArtifact.uri)) || null;

        setData('modelLocationType', ModelLocationType.ObjectStorage);
        if (decodedUri) {
          setData('modelLocationEndpoint', decodedUri.endpoint);
          setData('modelLocationBucket', decodedUri.bucket);
          setData('modelLocationRegion', decodedUri.region || '');
          // Don't prefill the path since a new version will have a new path.
        } else {
          // We don't want an old model's location staying here if we changed models but have no location to prefill.
          setData('modelLocationEndpoint', '');
          setData('modelLocationBucket', '');
          setData('modelLocationRegion', '');
        }
      } else {
        setData('sourceModelFormat', '');
        setData('sourceModelFormatVersion', '');
        setData('modelLocationType', ModelLocationType.ObjectStorage);
        setData('modelLocationEndpoint', '');
        setData('modelLocationBucket', '');
        setData('modelLocationRegion', '');
      }
    }
  }, [
    isLoadingVersionOrArtifact,
    latestArtifact,
    registeredModelId,
    formData.sourceModelFormat,
    formData.sourceModelFormatVersion,
    setData,
  ]);

  const onSubmit = () => {
    if (!registeredModel) {
      return; // We shouldn't be able to hit this due to form validation
    }
    handleSubmit(async () => {
      const { modelVersion } = await registerVersion(apiState, registeredModel, formData, author);
      navigate(modelVersionUrl(modelVersion.id, registeredModel.id, mrName));
    });
  };
  const onCancel = () =>
    navigate(
      prefilledRegisteredModelId && registeredModel
        ? registeredModelUrl(registeredModel.id, mrName)
        : modelRegistryUrl(mrName),
    );

  return (
    <ApplicationsPage
      title="Register new version"
      description="Register a latest version to the model you selected below."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={modelRegistryUrl(mrName)}>Registered models - {mrName}</Link>}
          />
          {prefilledRegisteredModelId && registeredModel && (
            <BreadcrumbItem
              render={() => (
                <Link to={registeredModelUrl(registeredModel.id, mrName)}>
                  {registeredModel.name}
                </Link>
              )}
            />
          )}
          <BreadcrumbItem>Register new version</BreadcrumbItem>
        </Breadcrumb>
      }
      loadError={loadRegisteredModelsError || loadModelVersionsError || loadModelArtifactsError}
      // Versions/artifacts are refetched when the model selection changes, so we don't handle their loaded state here.
      // Instead we show a spinner in RegisteredModelSelector after that selection changes.
      loaded={loadedRegisteredModels}
      empty={false}
    >
      <PageSection variant="light" isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem>
              <PrefilledModelRegistryField mrName={mrName} />
            </StackItem>
            <StackItem className={spacing.mbLg}>
              <FormGroup
                label="Model name"
                isRequired
                fieldId="model-name"
                labelIcon={
                  isLoadingVersionOrArtifact ? (
                    <Spinner size="sm" className={spacing.mlMd} />
                  ) : undefined
                }
              >
                <RegisteredModelSelector
                  registeredModels={liveRegisteredModels}
                  registeredModelId={registeredModelId}
                  setRegisteredModelId={(id) => setData('registeredModelId', id)}
                  isDisabled={!!prefilledRegisteredModelId}
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <RegistrationCommonFormSections
                formData={formData}
                setData={(
                  propKey: keyof RegistrationCommonFormData,
                  propValue: ValueOf<RegistrationCommonFormData>,
                ) => setData(propKey, propValue)}
                isFirstVersion={false}
                latestVersion={latestVersion}
              />
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <RegistrationFormFooter
        submitLabel="Register new version"
        submitError={submitError}
        setSubmitError={setSubmitError}
        isSubmitDisabled={isSubmitDisabled}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </ApplicationsPage>
  );
};

export default RegisterVersion;
