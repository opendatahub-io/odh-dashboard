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
import { RhUiTagIcon, ModelIcon } from '~/images/icons';

const ThirdPartyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ModelIcon
    style={{ color: 'var(--pf-v5-global--Color--200)', width: 42, height: 42 }}
    className={className}
  />
);

export const ModelCatalogCard: React.FC<{ model: CatalogModel; source: string }> = ({
  model,
  source,
}) => {
  const isRedHatSource = source === 'Red Hat';
  const logo = isRedHatSource ? model.logo : undefined;

  return (
    <Card isFullHeight>
      <CardHeader>
        <CardTitle>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              {logo ? (
                <img src={logo} alt={`${model.name} logo`} style={{ width: 42, height: 42 }} />
              ) : (
                <ThirdPartyIcon />
              )}
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
        {(model.tasks ?? []).map((task, index) => (
          <Label variant="outline" key={index}>
            {task}
          </Label>
        ))}
      </CardFooter>
    </Card>
  );
};
