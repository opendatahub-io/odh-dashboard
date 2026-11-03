import * as React from 'react';
import {
  Button,
  ButtonProps,
  Content,
  ContentProps,
  Truncate,
  TruncateProps,
} from '@patternfly/react-core';
import {
  t_global_border_width_regular as RegularBorderWidth,
  t_global_spacer_xs as ExtraSmallSpacerSize,
} from '@patternfly/react-tokens';
import BoldedText from './BoldedText';
import TruncatedText from './TruncatedText';

type UnderlinedTruncateButtonProps = ButtonProps & {
  content: string;
  color?: string;
  textDecoration?: string;
  contentProps?: ContentProps;
  truncateProps?: Partial<TruncateProps>;
  boldText?: string;
};

const UnderlinedTruncateButton: React.FC<UnderlinedTruncateButtonProps> = ({
  content,
  color = 'grey',
  textDecoration = 'underline dashed',
  contentProps,
  truncateProps,
  boldText,
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
        {boldText ? (
          <TruncatedText
            maxLines={1}
            content={<BoldedText text={content} boldText={boldText} />}
            style={{
              display: '-webkit-inline-box',
              color,
              borderBottom: `${RegularBorderWidth.var} dashed currentColor`,
            }}
          />
        ) : (
          <Truncate content={content} style={truncateStyle} {...truncateProps} />
        )}
      </Content>
    </Button>
  );
};

export default UnderlinedTruncateButton;
