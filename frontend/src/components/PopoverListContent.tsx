import * as React from 'react';
import {
  Text,
  TextContent,
  TextContentProps,
  TextList,
  TextListItem,
} from '@patternfly/react-core';

type PopoverListContentProps = TextContentProps & {
  leadText?: React.ReactNode;
  listHeading?: React.ReactNode;
  listItems: React.ReactNode[];
};

const ContentText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text component="small" style={{ color: 'var(--Text---pf-v5-global--Color--100)' }}>
    {children}
  </Text>
);

const PopoverListContent: React.FC<PopoverListContentProps> = ({
  leadText,
  listHeading,
  listItems,
  ...props
}) => (
  <TextContent {...props}>
    {leadText ? <ContentText>{leadText}</ContentText> : null}
    {listHeading ? <Text component="h4">{listHeading}</Text> : null}
    <TextList>
      {listItems.map((item, index) => (
        <TextListItem key={index}>
          <ContentText>{item}</ContentText>
        </TextListItem>
      ))}
    </TextList>
  </TextContent>
);

export default PopoverListContent;
