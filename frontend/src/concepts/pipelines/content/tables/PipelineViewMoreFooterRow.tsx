import * as React from 'react';
import { Badge, Button, Flex, FlexItem } from '@patternfly/react-core';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import useNotification from '#~/utilities/useNotification';

type PipelineViewMoreFooterRowProps = {
  visibleLength: number;
  totalSize: number;
  onClick: () => Promise<void>;
  errorTitle: string;
  isIndented?: boolean;
  colSpan: number;
};

const PipelineViewMoreFooterRow: React.FC<PipelineViewMoreFooterRowProps> = ({
  visibleLength,
  totalSize,
  onClick,
  errorTitle,
  isIndented,
  colSpan,
}) => {
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  if (visibleLength === totalSize) {
    return null;
  }

  return (
    <Tbody>
      <Tr>
        {isIndented && <Td />}
        <Td colSpan={colSpan}>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button
                isLoading={isLoading}
                isInline
                variant="link"
                onClick={() => {
                  setLoading(true);
                  onClick()
                    .catch((e) => notification.error(errorTitle, e.message))
                    .finally(() => setLoading(false));
                }}
              >
                View more
              </Button>
            </FlexItem>
            {!isLoading && (
              <FlexItem>
                <Badge isRead>{`Showing ${visibleLength}/${totalSize}`}</Badge>
              </FlexItem>
            )}
          </Flex>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default PipelineViewMoreFooterRow;
