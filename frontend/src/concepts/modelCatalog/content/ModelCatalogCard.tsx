import React from 'react';
import {
  Button,
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
  Truncate,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { CatalogModel } from '#~/concepts/modelCatalog/types';
import { getCatalogModelDetailsRouteFromModel } from '#~/routes/modelCatalog/catalogModelDetails';
import { getTagFromModel } from '#~/pages/modelCatalog/utils';
import { RhUiTagIcon } from '#~/images/icons';
import { ModelCatalogLabels } from '#~/concepts/modelCatalog/content/ModelCatalogLabels';
import TruncatedText from '#~/components/TruncatedText';

export const ModelCatalogCard: React.FC<{
  model: CatalogModel;
  source: string;
  truncate?: boolean;
}> = ({ model, source, truncate = false }) => {
  const navigate = useNavigate();
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
          <StackItem isFilled>
            <Button
              data-testid="model-catalog-detail-link"
              variant="link"
              isInline
              component="a"
              onClick={() => {
                navigate(getCatalogModelDetailsRouteFromModel(model, source) || '#');
              }}
              style={{
                fontSize: 'var(--pf-t--global--font--size--body--default)',
                fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
              }}
            >
              {truncate ? (
                <Truncate
                  data-testid="model-catalog-card-name"
                  content={model.name}
                  position="middle"
                  tooltipPosition="top"
                  style={{ textDecoration: 'underline' }}
                />
              ) : (
                <span>{model.name}</span>
              )}
            </Button>
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
          <StackItem isFilled data-testid="model-catalog-card-description">
            {truncate ? (
              <TruncatedText maxLines={2} content={model.description} />
            ) : (
              model.description
            )}
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter>
        <ModelCatalogLabels
          labels={model.labels}
          tasks={model.tasks}
          numLabels={truncate ? 2 : undefined}
        />
      </CardFooter>
    </Card>
  );
};
