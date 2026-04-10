import * as React from 'react';
import {
  Bullseye,
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  FormGroup,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { EllipsisVIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr, type ThProps } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { MaaSModelRefSummary, ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '~/app/pages/subscriptions/viewSubscription/utils';

type ModelColumnKey = 'name' | 'project' | 'tokenLimits';

const COLUMNS: { key: ModelColumnKey; label: string; width?: ThProps['width'] }[] = [
  { key: 'name', label: 'Name', width: 50 },
  { key: 'project', label: 'Project', width: 25 },
  { key: 'tokenLimits', label: 'Token limits', width: 25 },
];

export type MaasModelsSectionProps = {
  modelRefSummaries: MaaSModelRefSummary[];
  modelRefsWithRateLimits?: ModelSubscriptionRef[];
  hideColumns?: ModelColumnKey[];
  titleHeadingLevel?: React.ComponentProps<typeof Title>['headingLevel'];
  titleSize?: React.ComponentProps<typeof Title>['size'];
  editable?: boolean;
  rateLimitErrorIndices?: Set<number>;
  onAddModels?: () => void;
  onEditLimits?: (index: number) => void;
  onRemoveModel?: (index: number) => void;
  helperText?: React.ReactNode;
  formGroupFieldId?: string;
  sectionTestId?: string;
  tableTestId?: string;
  tableAriaLabel?: string;
  addModelsButtonTestId?: string;
  addModelsButtonAriaLabel?: string;
};

const MaasModelsSection: React.FC<MaasModelsSectionProps> = ({
  modelRefSummaries,
  modelRefsWithRateLimits = [],
  hideColumns = [],
  titleHeadingLevel = 'h2',
  titleSize = 'xl',
  editable = false,
  rateLimitErrorIndices,
  onAddModels,
  onEditLimits,
  onRemoveModel,
  helperText,
  formGroupFieldId = 'subscription-models',
  sectionTestId = 'subscription-models-section',
  tableTestId = 'subscription-models-table',
  tableAriaLabel = 'Subscription models',
  addModelsButtonTestId = 'add-models-button',
  addModelsButtonAriaLabel,
}) => {
  const [openKebabIndex, setOpenKebabIndex] = React.useState<number | null>(null);
  const visibleColumns = COLUMNS.filter((col) => !hideColumns.includes(col.key));

  const table = modelRefSummaries.length > 0 && (
    <Table aria-label={tableAriaLabel} variant="compact" data-testid={tableTestId}>
      <Thead>
        <Tr>
          {visibleColumns.map((col) => (
            <Th key={col.key} width={col.width}>
              {col.label}
            </Th>
          ))}
          {editable && <Th screenReaderText="Actions" />}
        </Tr>
      </Thead>
      <Tbody>
        {modelRefSummaries.map((modelRef, index) => {
          const tokenLimitsLines = formatTokenLimits(
            modelRefsWithRateLimits,
            modelRef.namespace,
            modelRef.name,
          );
          const tokenLimitsDisplay = tokenLimitsLines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </React.Fragment>
          ));

          const cellRenderers: Record<ModelColumnKey, React.ReactNode> = {
            name: (
              <Td key="name" dataLabel="Name">
                <TableRowTitleDescription
                  title={<strong>{modelRef.displayName ?? modelRef.name}</strong>}
                  subtitle={<code>{modelRef.name}</code>}
                  description={modelRef.description}
                  truncateDescriptionLines={2}
                />
              </Td>
            ),
            project: (
              <Td key="project" dataLabel="Project">
                {modelRef.namespace}
              </Td>
            ),
            tokenLimits: (
              <Td key="tokenLimits" dataLabel="Token limits">
                {editable && onEditLimits ? (
                  tokenLimitsLines.length > 0 ? (
                    <Button variant="link" isInline onClick={() => onEditLimits(index)}>
                      {tokenLimitsDisplay}
                    </Button>
                  ) : (
                    <Stack style={{ gap: 'var(--pf-t--global--spacer--sm)' }}>
                      <StackItem>
                        <Button
                          variant="link"
                          isInline
                          icon={<PlusCircleIcon />}
                          onClick={() => onEditLimits(index)}
                          data-testid={`add-token-limit-${index}`}
                        >
                          Add token limit
                        </Button>
                      </StackItem>
                      <StackItem>
                        <HelperText>
                          <HelperTextItem
                            variant={rateLimitErrorIndices?.has(index) ? 'error' : 'indeterminate'}
                          >
                            At least one token limit is required
                          </HelperTextItem>
                        </HelperText>
                      </StackItem>
                    </Stack>
                  )
                ) : (
                  tokenLimitsDisplay
                )}
              </Td>
            ),
          };

          return (
            <Tr key={`${modelRef.namespace}/${modelRef.name}`}>
              {visibleColumns.map((col) => cellRenderers[col.key])}
              {editable && (
                <Td isActionCell>
                  <Dropdown
                    isOpen={openKebabIndex === index}
                    onOpenChange={(open) => setOpenKebabIndex(open ? index : null)}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        ref={toggleRef}
                        variant="plain"
                        onClick={() => setOpenKebabIndex(openKebabIndex === index ? null : index)}
                        isExpanded={openKebabIndex === index}
                        aria-label={`Actions for ${modelRef.name}`}
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                    popperProps={{ position: 'right' }}
                  >
                    <DropdownList>
                      {onEditLimits && (
                        <DropdownItem
                          key="edit-token-limits"
                          onClick={() => {
                            onEditLimits(index);
                            setOpenKebabIndex(null);
                          }}
                        >
                          Edit token limits
                        </DropdownItem>
                      )}
                      <DropdownItem
                        key="remove"
                        isDanger
                        onClick={() => {
                          onRemoveModel?.(index);
                          setOpenKebabIndex(null);
                        }}
                      >
                        Remove model
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              )}
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  if (editable) {
    return (
      <FormGroup label="Models" fieldId={formGroupFieldId} isRequired data-testid={sectionTestId}>
        <Stack hasGutter>
          <StackItem>
            {helperText ?? <Content>Add models that subscribers will be able to use.</Content>}
          </StackItem>
          {table && <StackItem>{table}</StackItem>}
          <StackItem>
            <Button
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={onAddModels}
              data-testid={addModelsButtonTestId}
              aria-label={addModelsButtonAriaLabel}
            >
              Add models
            </Button>
          </StackItem>
        </Stack>
      </FormGroup>
    );
  }

  return (
    <Stack hasGutter data-testid={sectionTestId}>
      <StackItem>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Title headingLevel={titleHeadingLevel} size={titleSize}>
              Models
            </Title>
          </FlexItem>
          <FlexItem>
            <Content component="p">Models that subscribers will be able to use.</Content>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        {modelRefSummaries.length === 0 ? (
          <Bullseye>
            <Content component="p">No models assigned to this subscription.</Content>
          </Bullseye>
        ) : (
          table
        )}
      </StackItem>
    </Stack>
  );
};

export default MaasModelsSection;
