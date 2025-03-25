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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import EmptyModelCatalogState from '~/pages/modelCatalog/EmptyModelCatalogState';
import {
  decodeParams,
  findModelFromModelCatalogSources,
  getTagFromModel,
  isLabBase,
} from '~/pages/modelCatalog/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { getRegisterCatalogModelUrl } from '~/pages/modelCatalog/routeUtils';
import PopoverListContent from '~/components/PopoverListContent';
import { FindAdministratorOptions } from '~/pages/projects/screens/projects/const';
import { RhUiTagIcon } from '~/images/icons';
import { modelCustomizationRootPath } from '~/routes';
import RhUiControlsIcon from '~/images/icons/RhUiControlsIcon';
import { CatalogModelDetailsParams } from '~/pages/modelCatalog/types';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import ModelDetailsView from './ModelDetailsView';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const params = useParams<CatalogModelDetailsParams>();
  const navigate = useNavigate();
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const decodedParams = decodeParams(params);
  const { modelRegistryServices, modelRegistryServicesLoaded, modelRegistryServicesLoadError } =
    React.useContext(ModelRegistrySelectorContext);
  const tuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;
  const loaded = modelRegistryServicesLoaded && modelCatalogSources.loaded;

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

  const registerModelButton = (isSecondary = false) =>
    modelRegistryServices.length === 0 ? (
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
          data-testid="register-model-button"
          isAriaDisabled
          variant={isSecondary ? 'secondary' : 'primary'}
        >
          Register model
        </Button>
      </Popover>
    ) : (
      <Button
        variant={isSecondary ? 'secondary' : 'primary'}
        data-testid="register-model-button"
        onClick={() => navigate(getRegisterCatalogModelUrl(params))}
      >
        Register model
      </Button>
    );

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
            <ActionListItem>{registerModelButton(true)}</ActionListItem>
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
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/modelCatalog">Model catalog</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{decodedParams.modelName}</BreadcrumbItem>
        </Breadcrumb>
      }
      title={
        <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }}>
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
      loadError={modelRegistryServicesLoadError || modelCatalogSources.error}
      loaded={loaded}
      errorMessage="Unable to load model catalog"
      provideChildrenPadding
      headerAction={
        loaded && (
          <ActionList>
            <ActionListGroup>
              {tuningAvailable && isLabBase(model?.labels) && fineTuneActionItem}
              {registerModelButton()}
            </ActionListGroup>
          </ActionList>
        )
      }
    >
      {model && <ModelDetailsView model={model} />}
    </ApplicationsPage>
  );
});

export default ModelDetailsPage;
