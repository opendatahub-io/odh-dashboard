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
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import BrandImage from '~/components/BrandImage';
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
          <FlexItem>
            <BrandImage src={model.logo ?? ''} alt="" />
          </FlexItem>
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
              <span style={{ marginLeft: 'var(--pf-t--global--spacer--xs)' }}>
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
