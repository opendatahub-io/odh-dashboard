import {
  Breadcrumb,
  BreadcrumbItem,
  FormGroup,
  PageSection,
  Form,
  Stack,
  StackItem,
  capitalize,
} from '@patternfly/react-core';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ApplicationsPage from '~/pages/ApplicationsPage';
import {
  ModelLocationType,
  useRegisterCatalogModelData,
} from '~/pages/modelRegistry/screens/RegisterModel/useRegisterModelData';
import RegistrationCommonFormSections from '~/pages/modelRegistry/screens/RegisterModel/RegistrationCommonFormSections';
import {
  isNameValid,
  isRegisterCatalogModelSubmitDisabled,
  registerModel,
} from '~/pages/modelRegistry/screens/RegisterModel/utils';
import { SubmitLabel } from '~/pages/modelRegistry/screens/RegisterModel/const';
import RegisterModelDetailsFormSection from '~/pages/modelRegistry/screens/RegisterModel/RegisterModelDetailsFormSection';
import RegistrationFormFooter from '~/pages/modelRegistry/screens/RegisterModel/RegistrationFormFooter';
import { registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import { useAppSelector } from '~/redux/hooks';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import ModelRegistrySelector from '~/pages/modelRegistry/screens/ModelRegistrySelector';
import useModelRegistryAPIState from '~/concepts/modelRegistry/context/useModelRegistryAPIState';
import {
  createCustomPropertiesFromModel,
  decodeParams,
  findModelFromModelCatalogSources,
  getTagFromModel,
} from '~/pages/modelCatalog/utils';
import {
  ModelRegistryCustomProperties,
  ModelRegistryMetadataType,
} from '~/concepts/modelRegistry/types';
import { CatalogModelDetailsParams } from '~/pages/modelCatalog/types';
import { getCatalogModelDetailsUrl } from '~/pages/modelCatalog/routeUtils';

const RegisterCatalogModel: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = React.useMemo(() => decodeParams(params), [params]);

  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const [formData, setData] = useRegisterCatalogModelData();
  const [submittedRegisteredModelName, setSubmittedRegisteredModelName] =
    React.useState<string>('');
  const [submittedVersionName, setSubmittedVersionName] = React.useState<string>('');
  const [registrationErrorType, setRegistrationErrorType] = React.useState<string | undefined>(
    undefined,
  );

  const isModelNameValid = isNameValid(formData.modelName);

  // passing registeredModels as [] is temporary and will handle this as a part of https://issues.redhat.com/browse/RHOAIENG-20564
  const isSubmitDisabled =
    isSubmitting ||
    isRegisterCatalogModelSubmitDisabled(formData, {
      size: 0,
      pageSize: 0,
      nextPageToken: '',
      items: [],
    });

  const model: CatalogModel | null = React.useMemo(
    () =>
      findModelFromModelCatalogSources(
        modelCatalogSources.data,
        decodedParams.sourceName,
        decodedParams.repositoryName,
        decodedParams.modelName,
        decodedParams.tag,
      ),
    [modelCatalogSources, decodedParams],
  );

  // TODO hasPrefilledRef is a workaround - we should instead refactor so this useEffect isn't necessary.
  // See tech debt issue https://issues.redhat.com/browse/RHOAIENG-21678
  const hasPrefilledRef = React.useRef(false);
  React.useEffect(() => {
    if (model && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true;
      const labels = createCustomPropertiesFromModel(model);
      setData('modelName', `${model.name}-${getTagFromModel(model) || ''}`);
      setData('modelDescription', model.longDescription?.replace(/\s*\n\s*/g, ' ') ?? '');
      setData('versionName', 'Version 1');
      setData('modelLocationType', ModelLocationType.URI);
      setData('modelLocationURI', model.artifacts?.map((artifact) => artifact.uri)[0] || '');

      const registeredFromReferenceCustomProperties: ModelRegistryCustomProperties = Object.entries(
        decodedParams,
      )
        .filter(([key]) => /^\w+$/.test(key))
        .reduce((acc: ModelRegistryCustomProperties, [key, value]) => {
          if (typeof value === 'string') {
            acc[`_registeredFromCatalog${capitalize(key)}`] = {
              // eslint-disable-next-line camelcase
              string_value: value,
              metadataType: ModelRegistryMetadataType.STRING,
            };
          }
          return acc;
        }, {});
      setData('modelCustomProperties', labels);
      setData('versionCustomProperties', {
        ...labels,
        ...registeredFromReferenceCustomProperties,
        License: {
          // eslint-disable-next-line camelcase
          string_value: model.licenseLink || '',
          metadataType: ModelRegistryMetadataType.STRING,
        },
        Provider: {
          // eslint-disable-next-line camelcase
          string_value: model.provider ?? '',
          metadataType: ModelRegistryMetadataType.STRING,
        },
        'Registered from': {
          // eslint-disable-next-line camelcase
          string_value: 'Model catalog',
          metadataType: ModelRegistryMetadataType.STRING,
        },
        'Source model': {
          // eslint-disable-next-line camelcase
          string_value: model.name,
          metadataType: ModelRegistryMetadataType.STRING,
        },
        'Source model version': {
          // eslint-disable-next-line camelcase
          string_value:
            model.artifacts?.map((artifact) => artifact.tags && artifact.tags[0])[0] ?? '',
          metadataType: ModelRegistryMetadataType.STRING,
        },
      });
    }
  }, [model, setData, decodedParams]);

  const hostPath = `/api/service/modelregistry/${preferredModelRegistry?.metadata.name || ''}`;
  const [apiState] = useModelRegistryAPIState(hostPath);
  const author = useAppSelector((state) => state.user || '');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(undefined);

    const {
      data: { registeredModel, modelVersion, modelArtifact },
      errors,
    } = await registerModel(apiState, formData, author);
    if (registeredModel && modelVersion && modelArtifact) {
      navigate(registeredModelUrl(registeredModel.id, preferredModelRegistry?.metadata.name));
    } else if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      setSubmittedRegisteredModelName(formData.modelName);
      setSubmittedVersionName(formData.versionName);
      const resourceName = Object.keys(errors)[0];
      setRegistrationErrorType(resourceName);
      setSubmitError(errors[resourceName]);
    }
  };
  const onCancel = () => navigate(getCatalogModelDetailsUrl(params));

  return (
    <ApplicationsPage
      title={`Register ${params.modelName || ''} model`}
      description="Create a new model and register the first version of your new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/modelCatalog">Model catalog</Link>} />
          <BreadcrumbItem
            render={() => (
              <Link to={getCatalogModelDetailsUrl(params)}>{params.modelName || 'Loading...'}</Link>
            )}
          />
          <BreadcrumbItem data-testid="breadcrumb-version-name" isActive>
            Register model
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={modelCatalogSources.loaded}
      loadError={modelCatalogSources.error}
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem className={spacing.mbLg}>
              <FormGroup
                id="model-registry-container"
                label="Model registry"
                isRequired
                fieldId="model-registry-name"
              >
                <ModelRegistrySelector
                  modelRegistry={formData.modelRegistry}
                  onSelection={(mr) => setData('modelRegistry', mr)}
                  primary
                  isFullWidth
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <RegisterModelDetailsFormSection
                formData={formData}
                setData={setData}
                hasModelNameError={!isModelNameValid}
              />
              <RegistrationCommonFormSections
                formData={formData}
                setData={setData}
                isFirstVersion={false}
                isCatalogModel
              />
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <RegistrationFormFooter
        submitLabel={SubmitLabel.REGISTER_MODEL}
        submitError={submitError}
        isSubmitDisabled={isSubmitDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        registrationErrorType={registrationErrorType}
        versionName={submittedVersionName}
        modelName={submittedRegisteredModelName}
      />
    </ApplicationsPage>
  );
};

export default RegisterCatalogModel;
