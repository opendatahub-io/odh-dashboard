import * as React from 'react';
import {
  Button,
  ButtonProps,
  Content,
  ContentVariants,
  TooltipPosition,
  Truncate,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';

type UnderlinedTruncateButtonProps = ButtonProps & {
  content: string;
  textDecoration?: string;
  color?: string;
  contentSize?: ContentVariants;
  tooltipPosition?: TooltipPosition;
};

const UnderlinedTruncateButton: React.FC<UnderlinedTruncateButtonProps> = ({
  content,
  color = 'grey',
  textDecoration,
  contentSize,
  tooltipPosition,
  ...props
}) => {
  const truncateStyle = {
    textDecoration,
    color,
    textUnderlineOffset: ExtraSmallSpacerSize.var,
  };

  return (
    <Button variant="link" isInline {...props}>
      <Content component={contentSize}>
        <Truncate content={content} style={truncateStyle} tooltipPosition={tooltipPosition} />
      </Content>
    </Button>
  );
};

export default UnderlinedTruncateButton;
