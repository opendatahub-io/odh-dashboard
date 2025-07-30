import React from 'react';
import { Flex, Panel, PanelMain, PanelMainBody, Popover, Tooltip } from '@patternfly/react-core';

type TruncatedTextProps = {
  maxLines: number;
  content: React.ReactNode;
  truncateTooltip?: boolean;
} & Omit<React.HTMLProps<HTMLSpanElement>, 'content'>;

const tooltipShowDelay = 300;
const tooltipHideDelay = 150;

const TruncatedText: React.FC<TruncatedTextProps> = ({
  maxLines,
  content,
  truncateTooltip = false,
  ...props
}) => {
  const outerElementRef = React.useRef<HTMLElement>(null);
  const textElementRef = React.useRef<HTMLElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const [isTruncated, setIsTruncated] = React.useState<boolean>(false);
  const [showPopover, setShowPopover] = React.useState<boolean>(false);

  const updateTruncation = React.useCallback(() => {
    if (textElementRef.current && outerElementRef.current) {
      setIsTruncated(textElementRef.current.offsetHeight > outerElementRef.current.offsetHeight);
    }
  }, []);

  const handlePopoverMouseEnter = () => {
    // Popover has no delay, so need to set manually
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isTruncated && truncateTooltip) {
      timeoutRef.current = setTimeout(() => setShowPopover(true), tooltipShowDelay);
    }
  };

  const handlePopoverMouseLeave = () => {
    if (truncateTooltip) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setShowPopover(false), tooltipHideDelay);
    }
  };

  const truncateBody = (
    <span
      {...props}
      style={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        overflowWrap: 'anywhere',
        overflow: 'hidden',
        WebkitLineClamp: maxLines,
        ...(props.style || {}),
      }}
      ref={outerElementRef}
      onMouseEnter={(e) => {
        props.onMouseLeave?.(e);
        updateTruncation();
      }}
      onFocus={(e) => {
        props.onFocus?.(e);
        updateTruncation();
      }}
    >
      <span ref={textElementRef}>{content}</span>
    </span>
  );

  return truncateTooltip ? (
    <>
      {isTruncated ? (
        <Flex onMouseEnter={handlePopoverMouseEnter} onMouseLeave={handlePopoverMouseLeave}>
          <Popover
            hasNoPadding
            triggerAction="hover"
            isVisible={showPopover}
            bodyContent={
              <Panel isScrollable>
                <PanelMain maxHeight="500px" tabIndex={0}>
                  <PanelMainBody>{content}</PanelMainBody>
                </PanelMain>
              </Panel>
            }
          >
            {truncateBody}
          </Popover>
        </Flex>
      ) : (
        <>{truncateBody}</>
      )}
    </>
  ) : (
    <Tooltip hidden={!isTruncated ? true : undefined} content={content}>
      {truncateBody}
    </Tooltip>
  );
};

export default TruncatedText;
