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
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import BrandImage from '~/components/BrandImage';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { modelDetailsUrlFromModel } from '~/pages/modelCatalog/routeUtils';
import { getTagFromModel } from '~/pages/modelCatalog/utils';

export const ModelCatalogCard: React.FC<{ model: CatalogModel; source: string }> = ({
  model,
  source,
}) => (
  <Card isFullHeight>
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
            to={modelDetailsUrlFromModel(model, source) || '#'}
            style={{
              fontSize: 'var(--pf-t--global--font--size--body--default)',
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            }}
          >
            {model.name}
          </Link>
          <Split hasGutter>
            <SplitItem>
              <Icon>
                <TagIcon />
              </Icon>
            </SplitItem>
            <SplitItem isFilled>{getTagFromModel(model)}</SplitItem>
          </Split>
        </StackItem>
        <StackItem isFilled>{model.description}</StackItem>
        <StackItem>
          {(model.tasks ?? []).map((task, index) => (
            <Label variant="outline" key={index}>
              {task}
            </Label>
          ))}
        </StackItem>
      </Stack>
    </CardBody>
  </Card>
);
