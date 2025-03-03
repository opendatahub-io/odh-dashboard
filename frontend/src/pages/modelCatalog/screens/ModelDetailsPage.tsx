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
} from '~/pages/modelCatalog/utils';
import { ModelDetailsRouteParams } from '~/pages/modelCatalog/const';
import BrandImage from '~/components/BrandImage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { registerCatalogModel } from '~/pages/modelCatalog/routeUtils';
import PopoverListContent from '~/components/PopoverListContent';
import { FindAdministratorOptions } from '~/pages/projects/screens/projects/const';
import { RhUiTagIcon } from '~/images/icons';
import { modelCustomizationRootPath } from '~/routes';
import RhUiControlsIcon from '~/images/icons/RhUiControlsIcon';
import ModelDetailsView from './ModelDetailsView';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const params = useParams<ModelDetailsRouteParams>();
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
        headerContent="Register to model registry?"
        triggerAction="hover"
        data-testid="register-catalog-model-popover"
        bodyContent={
          <PopoverListContent
            data-testid="Register-model-button-popover"
            leadText="To request access to the model registry, contact your administrator."
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
        onClick={() => navigate(registerCatalogModel(params))}
      >
        Register model
      </Button>
    );

  const fineTuneActionItem = (
    <Popover
      data-testid="tune-model-popover"
      minWidth="min-content"
      aria-label="Popover for fine tuning the model"
      headerContent="How to tune this model?"
      headerIcon={<RhUiControlsIcon />}
      bodyContent={
        <div>
          To fine-tune this model, you must first register it to an OpenShift AI model registry,
          then click Lab tune.
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
        Tune this model?
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
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <BrandImage src={model?.logo ?? ''} alt="" />
          </FlexItem>
          <FlexItem>
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
          </FlexItem>
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
              {tuningAvailable && fineTuneActionItem}
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
