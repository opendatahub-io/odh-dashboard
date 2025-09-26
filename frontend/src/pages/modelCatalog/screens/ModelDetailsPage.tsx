import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ActionList,
  ActionListItem,
  Breadcrumb,
  BreadcrumbItem,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Button,
  Popover,
  ActionListGroup,
  Skeleton,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { conditionalArea, SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ModelCatalogContext } from '#~/concepts/modelCatalog/context/ModelCatalogContext';
import { CatalogModel } from '#~/concepts/modelCatalog/types';
import EmptyModelCatalogState from '#~/pages/modelCatalog/EmptyModelCatalogState';
import {
  decodeParams,
  findModelFromModelCatalogSources,
  getTagFromModel,
  isLabBase,
} from '#~/pages/modelCatalog/utils';
import PopoverListContent from '#~/components/PopoverListContent';
import { FindAdministratorOptions } from '#~/pages/projects/screens/projects/const';
import { RhUiTagIcon } from '#~/images/icons';
import { modelCustomizationRootPath } from '#~/routes/pipelines/modelCustomization';
import { getRegisterCatalogModelRoute } from '#~/routes/modelCatalog/catalogModelRegister';
import RhUiControlsIcon from '#~/images/icons/RhUiControlsIcon';
import { CatalogModelDetailsParams } from '#~/pages/modelCatalog/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import ScrollViewOnMount from '#~/components/ScrollViewOnMount';
import { isOciModelUri } from '#~/pages/modelServing/utils';
import useDeployButtonState from '#~/pages/modelServing/screens/projects/useDeployButtonState';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import ModelDetailsView from './ModelDetailsView';
import DeployCatalogModelModal from './DeployCatalogModelModal';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const params = useParams<CatalogModelDetailsParams>();
  const navigate = useNavigate();
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const decodedParams = decodeParams(params);
  const { modelRegistryServices, modelRegistryServicesLoaded, modelRegistryServicesLoadError } =
    React.useContext(ModelRegistriesContext);
  const tuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;
  const loaded =
    (modelRegistryServicesLoaded || !!modelRegistryServicesLoadError) && modelCatalogSources.loaded;
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
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
  const isOciModel = isOciModelUri(model?.artifacts?.map((artifact) => artifact.uri)[0]);
  const deployButtonState = useDeployButtonState(isOciModel);

  const registerModelButton = () => {
    if (modelRegistryServicesLoadError) {
      return null;
    }

    return modelRegistryServices.length === 0 ? (
      <Popover
        headerContent="Request access to a model registry"
        triggerAction="hover"
        data-testid="register-catalog-model-popover"
        bodyContent={
          <PopoverListContent
            data-testid="Register-model-button-popover"
            leadText="To request a new model registry, or to request permission to access an existing model registry, contact your administrator."
            listHeading="Your administrator might be:"
            listItems={FindAdministratorOptions}
          />
        }
      >
        <Button
          variant={!deployButtonState.visible ? 'primary' : 'secondary'}
          isAriaDisabled
          data-testid="register-model-button"
        >
          Register model
        </Button>
      </Popover>
    ) : (
      <Button
        data-testid="register-model-button"
        variant={!deployButtonState.visible ? 'primary' : 'secondary'}
        onClick={() => {
          navigate(getRegisterCatalogModelRoute(decodedParams));
        }}
      >
        Register model
      </Button>
    );
  };

  const renderDeployModelButton = () => {
    const deployModelButton = (
      <Button
        variant="primary"
        data-testid="deploy-model-button"
        onClick={() => setIsDeployModalOpen(true)}
        isAriaDisabled={!deployButtonState.enabled}
      >
        Deploy model
      </Button>
    );

    if (deployButtonState.enabled) {
      return deployModelButton;
    }
    return <Tooltip content={deployButtonState.tooltip}>{deployModelButton}</Tooltip>;
  };

  const fineTuneActionItem = (
    <Popover
      data-testid="tune-model-popover"
      minWidth="min-content"
      aria-label="Popover for fine tuning the model"
      headerContent="LAB-tune this model?"
      headerIcon={<RhUiControlsIcon />}
      bodyContent={
        <div>
          To LAB-tune this model, you must first register it as a version to an {ODH_PRODUCT_NAME}{' '}
          model registry, then from that version’s details page, click <strong> LAB-tune</strong>
        </div>
      }
      footerContent={
        <ActionList>
          <ActionListGroup>
            <ActionListItem>{registerModelButton()}</ActionListItem>
            <ActionListItem>
              <Button variant="link" onClick={() => navigate(modelCustomizationRootPath)}>
                Learn more about model customization
              </Button>
            </ActionListItem>
          </ActionListGroup>
        </ActionList>
      }
    >
      <Button icon={<OutlinedQuestionCircleIcon />} variant="link" data-testid="tune-model-button">
        LAB-tune this model?
      </Button>
    </Popover>
  );

  return (
    <>
      <ScrollViewOnMount shouldScroll />
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to="/ai-hub/catalog">Catalog</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{decodedParams.modelName}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={
          <Flex
            spaceItems={{ default: 'spaceItemsMd' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            {model?.logo ? (
              <img src={model.logo} alt="model logo" style={{ height: '40px', width: '40px' }} />
            ) : (
              <Skeleton
                shape="square"
                width="40px"
                height="40px"
                screenreaderText="Brand image loading"
              />
            )}
            <Stack>
              <StackItem>
                <Flex
                  spaceItems={{ default: 'spaceItemsSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>{decodedParams.modelName}</FlexItem>
                  {model && (
                    <Label variant="outline" icon={<RhUiTagIcon />}>
                      {getTagFromModel(model)}
                    </Label>
                  )}
                </Flex>
              </StackItem>
              {model && (
                <StackItem>
                  <Content component={ContentVariants.small}>Provided by {model.provider}</Content>
                </StackItem>
              )}
            </Stack>
          </Flex>
        }
        empty={model === null}
        emptyStatePage={
          <EmptyModelCatalogState
            testid="empty-model-catalog-state"
            title="Details not found"
            description="To request access to model catalog, contact your administrator."
            headerIcon={() => (
              <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
            )}
          />
        }
        loadError={modelCatalogSources.error}
        loaded={loaded}
        errorMessage="Unable to load model catalog"
        provideChildrenPadding
        headerAction={
          loaded && (
            <ActionList>
              <ActionListGroup>
                {tuningAvailable && isLabBase(model?.labels) && fineTuneActionItem}
                {deployButtonState.visible && renderDeployModelButton()}
                {registerModelButton()}
              </ActionListGroup>
            </ActionList>
          )
        }
      >
        {model && (
          <>
            <ModelDetailsView model={model} />
            {isDeployModalOpen && (
              <DeployCatalogModelModal
                model={model}
                onSubmit={(selectedProject) => {
                  navigate(`/ai-hub/deployments/${selectedProject.metadata.name}`);
                }}
                onCancel={() => setIsDeployModalOpen(false)}
              />
            )}
          </>
        )}
      </ApplicationsPage>
    </>
  );
});

export default ModelDetailsPage;
