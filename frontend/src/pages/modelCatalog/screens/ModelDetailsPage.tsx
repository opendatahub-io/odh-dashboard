import React from 'react';
import { useParams } from 'react-router';
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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TagIcon } from '@patternfly/react-icons';
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
import ModelDetailsView from './ModelDetailsView';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const params = useParams<ModelDetailsRouteParams>();

  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  const decodedParams = decodeParams(params);

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
            <Link to="/modelCatalog">Model Catalog</Link>
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
                    <Label variant="outline" icon={<TagIcon />}>
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
      empty={Boolean(modelCatalogSources.error) || model === null}
      emptyStatePage={
        <EmptyModelCatalogState
          testid="empty-model-catalog-state"
          title={modelCatalogSources.error ? 'Details not found' : 'Unable to load model details'}
          description={modelCatalogSources.error?.message || 'Refresh the page or try again later'}
          headerIcon={() => (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels, 'Error')} alt="" />
          )}
        />
      }
      loaded={!modelCatalogSources.error && modelCatalogSources.loaded}
      loadError={modelCatalogSources.error || undefined}
      errorMessage="Unable to load model catalog"
      provideChildrenPadding
    >
      {model && <ModelDetailsView model={model} />}
    </ApplicationsPage>
  );
});

export default ModelDetailsPage;
