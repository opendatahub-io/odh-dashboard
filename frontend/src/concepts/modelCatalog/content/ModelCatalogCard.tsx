import React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Icon,
  Label,
  Skeleton,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { getCatalogModelDetailsRouteFromModel } from '~/routes';
import { getTagFromModel } from '~/pages/modelCatalog/utils';
import { RhUiTagIcon } from '~/images/icons';
import { ModelCatalogLabels } from '~/concepts/modelCatalog/content/ModelCatalogLabels';
import TruncatedText from '~/components/TruncatedText';

type ModelCatalogCardProps = {
  model: CatalogModel;
  source: string;
  truncate?: boolean;
};

const TRUNCATED_LEFT_EDGE_LENGTH = 15;
const TRUNCATED_RIGHT_EDGE_LENGTH = Math.floor(TRUNCATED_LEFT_EDGE_LENGTH / 2);
const ELLIPSIS = '...';
const MAX_LENGTH = TRUNCATED_LEFT_EDGE_LENGTH + ELLIPSIS.length + TRUNCATED_RIGHT_EDGE_LENGTH;

export const ModelCatalogCard: React.FC<ModelCatalogCardProps> = ({
  model,
  source,
  truncate = false,
}) => {
  const truncateNameEnabled = truncate && model.name.length > MAX_LENGTH;
  return (
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
              to={getCatalogModelDetailsRouteFromModel(model, source) || '#'}
              style={{
                fontSize: 'var(--pf-t--global--font--size--body--default)',
                fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
              }}
            >
              {truncateNameEnabled ? (
                <Tooltip content={model.name} position="top">
                  <span>{`${model.name.substring(
                    0,
                    TRUNCATED_LEFT_EDGE_LENGTH,
                  )}${ELLIPSIS}${model.name.slice(-TRUNCATED_RIGHT_EDGE_LENGTH)}`}</span>
                </Tooltip>
              ) : (
                <span>{model.name}</span>
              )}
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
          <StackItem isFilled>
            {truncate ? (
              <TruncatedText maxLines={2} content={model.description} />
            ) : (
              model.description
            )}
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter>
        <ModelCatalogLabels labels={model.labels} tasks={model.tasks} truncate={truncate} />
      </CardFooter>
    </Card>
  );
};
