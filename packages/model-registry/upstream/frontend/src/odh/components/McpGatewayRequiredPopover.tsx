import React from 'react';
import { Popover } from '@patternfly/react-core';
import McpGatewayDocsLink from '~/odh/components/McpGatewayDocsLink';

const POPOVER_ID = 'mcp-deploy-gateway-popover';
/** Time to move the pointer from the trigger across the gap onto the popover. */
const HOVER_CLOSE_DELAY_MS = 500;
/** The id PatternFly gives the popover body, so the trigger can reference it. */
export const MCP_GATEWAY_POPOVER_BODY_ID = `popover-${POPOVER_ID}-body`;

type McpGatewayRequiredPopoverProps = {
  explanation: string;
  /** The (aria-disabled) Deploy button; focus returns to it when Escape closes the popover. */
  triggerRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactElement;
};

/**
 * Explains why Deploy is blocked and links to the MCP gateway docs. Works like a tooltip
 * (opens on hover or focus) but stays open while the pointer or keyboard focus is inside it,
 * so the docs link can be clicked or reached with Tab. It is rendered right after the trigger
 * in the DOM so Tab moves from the trigger into the popover. When the pointer leaves, it closes
 * after a short delay, so the pointer can cross the gap between the trigger and the popover.
 */
const McpGatewayRequiredPopover: React.FC<McpGatewayRequiredPopoverProps> = ({
  explanation,
  triggerRef,
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const cancelClose = () => clearTimeout(closeTimerRef.current);
  const open = () => {
    cancelClose();
    setIsOpen(true);
  };
  const close = () => {
    cancelClose();
    setIsOpen(false);
  };
  const closeAfterDelay = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setIsOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  React.useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const isInside = (target: EventTarget | null) =>
    target instanceof Node && !!containerRef.current?.contains(target);

  return (
    <span
      ref={containerRef}
      onMouseEnter={open}
      onMouseLeave={closeAfterDelay}
      onFocus={open}
      onBlur={(event) => {
        if (!isInside(event.relatedTarget)) {
          close();
        }
      }}
    >
      <Popover
        id={POPOVER_ID}
        triggerAction="hover"
        appendTo="inline"
        isVisible={isOpen}
        // Pointer and focus are tracked on the wrapper above. Only handle what the wrapper
        // cannot see: Escape and clicks outside.
        shouldOpen={() => undefined}
        shouldClose={(event) => {
          if (event instanceof KeyboardEvent) {
            if (isInside(document.activeElement)) {
              triggerRef.current?.focus();
            }
            close();
          } else if (event.type === 'click' && !isInside(event.target)) {
            close();
          }
        }}
        triggerRef={triggerRef}
        headerContent="MCP gateway required"
        bodyContent={explanation}
        footerContent={<McpGatewayDocsLink />}
        data-testid="mcp-deploy-gateway-popover"
      >
        {children}
      </Popover>
    </span>
  );
};

export default McpGatewayRequiredPopover;
