import * as React from 'react';
import {
  Button,
  CardBody,
  CardFooter,
  Flex,
  FlexItem,
  Content,
  Tooltip,
} from '@patternfly/react-core';
import { KUEUE_WORKBENCH_CREATION_DISABLED_MESSAGE } from '#~/kueueUtils';

type MetricsCardProps = {
  title: string;
  statistics: { count: number; text: string; onClick?: () => void }[];
  createButton?: React.ReactNode | false;
  createText?: string;
  onCreate?: () => void;
  listItems?: React.ReactNode;
  isKueueDisabled?: boolean;
};

const MetricsContents: React.FC<MetricsCardProps> = ({
  title,
  createButton,
  createText,
  onCreate,
  statistics,
  listItems,
  isKueueDisabled,
}) => (
  <>
    <CardBody>
      <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
        <FlexItem>
          <Flex gap={{ default: 'gapLg' }}>
            {statistics.map((stats) => {
              const statTextId = stats.text.replace(' ', '-');
              const baseId = `${title}-${statTextId}`;

              return (
                <FlexItem key={stats.text} id={`${baseId}-statText`}>
                  {stats.onClick ? (
                    <Button
                      id={`${baseId}-statAmount`}
                      aria-labelledby={`${baseId}-statAmount ${baseId}-statText`}
                      variant="link"
                      isInline
                      onClick={stats.onClick}
                      style={{ fontSize: 'var(--pf-t--global--font--size--body--default)' }}
                    >
                      {stats.count}
                    </Button>
                  ) : (
                    <Content>
                      <Content component="p">{stats.count}</Content>
                    </Content>
                  )}
                  <div>
                    <div id={`${baseId}-statText`}>{stats.text}</div>
                  </div>
                </FlexItem>
              );
            })}
          </Flex>
        </FlexItem>
        <FlexItem>{listItems}</FlexItem>
      </Flex>
    </CardBody>
    <CardFooter>
      {createButton ||
        (isKueueDisabled ? (
          <Tooltip content={KUEUE_WORKBENCH_CREATION_DISABLED_MESSAGE}>
            <Button isAriaDisabled variant="link" isInline onClick={onCreate}>
              {createText}
            </Button>
          </Tooltip>
        ) : (
          <Button variant="link" isInline onClick={onCreate}>
            {createText}
          </Button>
        ))}
    </CardFooter>
  </>
);

export default MetricsContents;
