import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Icon,
  Split,
  SplitItem,
  CardFooter,
  Skeleton,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { getCatalogModelDetailsUrlFromModel } from '~/pages/modelCatalog/routeUtils';
import { getTagFromModel } from '~/pages/modelCatalog/utils';
import { RhUiTagIcon } from '~/images/icons';
import { ModelCatalogLabels } from '~/pages/modelCatalog/components/ModelCatalogLabels';

export const ModelCatalogCard: React.FC<{ model: CatalogModel; source: string }> = ({
  model,
  source,
}) => (
  <Card isFullHeight data-testid="model-catalog-card">
    <CardHeader>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          {model.logo ? (
            <img src={model.logo} alt="model logo" style={{ height: '36px', width: '36px' }} />
          ) : (
            <Skeleton
              shape="square"
              width="36px"
              height="36px"
              screenreaderText="Brand image loading"
            />
          )}
          <FlexItem align={{ default: 'alignRight' }}>
            <Label>{source}</Label>
          </FlexItem>
        </Flex>
      </CardTitle>
    </CardHeader>
    <CardBody>
      <Stack hasGutter>
        <StackItem>
          <Link
            data-testid="model-catalog-detail-link"
            to={getCatalogModelDetailsUrlFromModel(model, source) || '#'}
            style={{
              fontSize: 'var(--pf-t--global--font--size--body--default)',
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            }}
          >
            {model.name}
          </Link>
          <Split hasGutter>
            <SplitItem>
              <Icon isInline>
                <RhUiTagIcon />
              </Icon>
              <span style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>
                {getTagFromModel(model)}
              </span>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem isFilled>{model.description}</StackItem>
      </Stack>
    </CardBody>
    <CardFooter>
      <ModelCatalogLabels labels={model.labels} tasks={model.tasks} />
    </CardFooter>
  </Card>
);
