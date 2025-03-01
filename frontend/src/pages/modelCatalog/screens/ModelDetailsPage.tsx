import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
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
        loaded &&
        (modelRegistryServices.length === 0 ? (
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
            <Button data-testid="register-model-button" isAriaDisabled>
              Register model
            </Button>
          </Popover>
        ) : (
          <Button
            data-testid="register-model-button"
            onClick={() => navigate(registerCatalogModel(params))}
          >
            Register model
          </Button>
        ))
      }
    >
      {model && <ModelDetailsView model={model} />}
    </ApplicationsPage>
  );
});

export default ModelDetailsPage;
