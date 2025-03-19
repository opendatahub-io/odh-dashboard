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
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { getCatalogModelDetailsUrlFromModel } from '~/pages/modelCatalog/routeUtils';
import { getTagFromModel } from '~/pages/modelCatalog/utils';
import { RhUiTagIcon } from '~/images/icons';
import BrandImage from '~/components/BrandImage';
import { ModelCatalogLabels } from './ModelCatalogLabels';

export const ModelCatalogCard: React.FC<{ model: CatalogModel; source: string }> = ({
  model,
  source,
}) => (
  <Card isFullHeight data-testid="model-catalog-card">
    <CardHeader>
      <CardTitle>
        <Flex>
          <FlexItem>
            <BrandImage src={model.logo || ''} alt={`${model.name} logo`} />
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
              <span style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>
                {getTagFromModel(model)}
              </span>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem isFilled>{model.description}</StackItem>
        <StackItem>
          <ModelCatalogLabels labels={model.labels} tasks={model.tasks} />
        </StackItem>
      </Stack>
    </CardBody>
    <CardFooter>
      {(model.tasks ?? []).map((task, index) => (
        <Label variant="outline" key={index}>
          {task}
        </Label>
      ))}
    </CardFooter>
  </Card>
);
