import * as React from 'react';
import {
  Button,
  ButtonProps,
  Content,
  ContentProps,
  Truncate,
  TruncateProps,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';

type UnderlinedTruncateButtonProps = ButtonProps & {
  content: string;
  color?: string;
  textDecoration?: string;
  contentProps?: ContentProps;
  truncateProps?: Partial<TruncateProps>;
};

const UnderlinedTruncateButton: React.FC<UnderlinedTruncateButtonProps> = ({
  content,
  color = 'grey',
  textDecoration = 'underline dashed',
  contentProps,
  truncateProps,
  ...props
}) => {
  const truncateStyle = {
    textDecoration,
    color,
    textUnderlineOffset: ExtraSmallSpacerSize.var,
  };

  return (
    <Button variant="link" isInline {...props}>
      <Content {...contentProps}>
        <Truncate content={content} style={truncateStyle} {...truncateProps} />
      </Content>
    </Button>
  );
};

export default UnderlinedTruncateButton;
