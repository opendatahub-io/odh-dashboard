import * as React from 'react';
import {
  Button,
  CardBody,
  CardFooter,
  Flex,
  FlexItem,
  Text,
  TextContent,
} from '@patternfly/react-core';

type MetricsCardProps = {
  title: string;
  statistics: { count: number; text: string; onClick?: () => void }[];
  createButton?: React.ReactNode | false;
  createText?: string;
  onCreate?: () => void;
  listItems?: React.ReactNode;
};

const MetricsContents: React.FC<MetricsCardProps> = ({
  title,
  createButton,
  createText,
  onCreate,
  statistics,
  listItems,
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
                      style={{ fontSize: 'var(--pf-v5-global--FontSize--md)' }}
                    >
                      {stats.count}
                    </Button>
                  ) : (
                    <TextContent>
                      <Text component="p">{stats.count}</Text>
                    </TextContent>
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
      {createButton || (
        <Button variant="link" isInline onClick={onCreate}>
          {createText}
        </Button>
      )}
    </CardFooter>
  </>
);

export default MetricsContents;
