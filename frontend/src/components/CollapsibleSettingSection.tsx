import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';

type SettingSectionProps = {
  children: React.ReactNode;
  title: string;
  testId?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  id?: string | number;
};

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  children,
  footer,
  testId,
  description,
  id,
}) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const localId = id || title.replace(/ /g, '-');
  const titleId = `${localId}-title`;

  return (
    <Card data-testid={testId}>
      <CardTitle>
        <Flex
          gap={{ default: 'gapNone' }}
          alignItems={{ default: 'alignItemsCenter' }}
          style={{ marginLeft: 'calc(var(--pf-t--global--spacer--md) * -1)' }}
        >
          <FlexItem>
            <Button
              icon={collapsed ? <AngleRightIcon /> : <AngleDownIcon />}
              aria-labelledby={titleId}
              aria-expanded={!collapsed}
              variant="plain"
              style={{
                paddingLeft: 0,
                paddingRight: 0,
              }}
              onClick={() => setCollapsed((prev) => !prev)}
            />
          </FlexItem>
          <FlexItem>
            <Content id={titleId} component={ContentVariants.h3}>
              {title}
            </Content>
          </FlexItem>
        </Flex>
      </CardTitle>
      {!collapsed ? (
        <>
          <CardBody>
            <Stack hasGutter>
              {description && <StackItem>{description}</StackItem>}
              <StackItem>{children}</StackItem>
            </Stack>
          </CardBody>
          {footer && <CardFooter>{footer}</CardFooter>}
        </>
      ) : null}
    </Card>
  );
};

export default SettingSection;
