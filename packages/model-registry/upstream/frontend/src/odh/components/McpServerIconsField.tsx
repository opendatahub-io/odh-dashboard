import React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Panel,
  PanelMain,
  PanelMainBody,
  Stack,
  StackItem,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import {
  ExclamationCircleIcon,
  MinusCircleIcon,
  OutlinedImageIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { FieldGroupHelpLabelIcon, SimpleSelect, SortableData, Table } from 'mod-arch-shared';
import type { SimpleSelectOption } from 'mod-arch-shared/dist/components/SimpleSelect';
import { useIconFallback } from '~/odh/hooks/useIconFallback';
import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';
import { resolveIcon, sanitizeHref } from '~/odh/utils/registerUtils';

const THEME_OPTIONS: SimpleSelectOption[] = [
  { key: 'any', label: 'Any' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

const ICON_HELP =
  "Set icons or override icons from server.json. Use 'light' or 'dark' for theme-specific icons, or 'any' for one that works in both.";

const ICON_URL_PLACEHOLDER = 'https://example.com/icon.svg';

// Override Panel's default border-radius token so it renders larger than the compact
// icon-preview swatches inside it (which intentionally use a smaller radius).
const ICONS_PANEL_STYLE: React.CSSProperties & Record<`--${string}`, string> = {
  '--pf-v6-c-panel--BorderRadius': 'var(--pf-t--global--border--radius--medium)',
};

// PatternFly tables give the first/last cell in a row extra inline padding (an "edge inset")
// intended for full-bleed tables. Zero it out here so the table lines up with the sibling
// form fields above and below it.
//
// The first column's `field` is intentionally NOT `'src'`. mod-arch-shared's `Table` always
// sorts rows by column 0's `field` (defaulting `defaultSortColumn` to `0`), even though
// `sortable: false` -- `sortable` only controls whether the sort control renders in the
// header, not whether the default sort runs. If this matched the real `src` property, rows
// would silently reorder (alphabetically by URL) as soon as two rows' values differed, e.g.
// right after adding a blank row above a filled one -- desyncing each row's displayed
// position from the array index its change handlers write to. Keep it a no-op field name so
// rows always render in insertion order.
const ICON_COLUMNS: SortableData<MCPIcon>[] = [
  {
    field: 'iconUrlNoSort',
    label: 'Icon URL',
    sortable: false,
    width: 70,
    className: 'pf-v6-u-pl-0',
  },
  { field: 'theme', label: 'Theme', sortable: false, width: 20 },
  { field: 'actions', label: '', sortable: false, className: 'pf-v6-u-pr-0' },
];

type IconSource = 'explicit' | 'server-json' | 'default';

const SOURCE_CAPTIONS: Record<IconSource, string> = {
  explicit: 'Custom icon',
  'server-json': 'From server.json',
  default: 'No icon set',
};

type ThemeKey = 'any' | 'light' | 'dark';

const themeKeyToValue = (key: ThemeKey): 'light' | 'dark' | undefined =>
  key === 'any' ? undefined : key;

type McpServerIconsFieldProps = {
  icons: MCPIcon[];
  onChange: (icons: MCPIcon[]) => void;
  serverJsonIcons?: MCPIcon[];
};

type IconPreviewItemProps = {
  isDark: boolean;
  icon: MCPIcon | undefined;
  fallbackIcon: MCPIcon | undefined;
  testId: string;
  onLoadError?: (failedSrc: string) => void;
};

const IconPreviewItem: React.FC<IconPreviewItemProps> = ({
  isDark,
  icon,
  fallbackIcon,
  testId,
  onLoadError,
}) => {
  const sanitizedPrimary = sanitizeHref(icon?.src);
  const sanitizedFallback = sanitizeHref(fallbackIcon?.src);
  const { activeSrc, onError: onIconError } = useIconFallback(sanitizedPrimary, sanitizedFallback);

  const source: IconSource =
    activeSrc && activeSrc === sanitizedPrimary
      ? 'explicit'
      : activeSrc && activeSrc === sanitizedFallback
        ? 'server-json'
        : 'default';

  const captionText = SOURCE_CAPTIONS[source];
  const tooltipContent =
    source === 'default'
      ? captionText
      : source === 'server-json'
        ? `${captionText}: ${activeSrc}`
        : activeSrc;

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      gap={{ default: 'gapSm' }}
      data-testid={testId}
    >
      <FlexItem>
        <Tooltip content={tooltipContent}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentCenter' }}
            className={`pf-v6-u-p-sm ${
              isDark ? 'pf-v6-u-background-color-inverse' : 'pf-v6-u-background-color-primary'
            }`}
            style={{
              width: '2.75rem',
              height: '2.75rem',
              border: '1px solid var(--pf-t--global--border--color--default)',
              borderRadius: 'var(--pf-t--global--border--radius--small)',
            }}
          >
            {activeSrc ? (
              <img
                src={activeSrc}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => {
                  if (activeSrc === sanitizedPrimary && icon?.src) {
                    onLoadError?.(icon.src);
                  }
                  onIconError();
                }}
                style={{ maxHeight: '1.75rem', maxWidth: '1.75rem', objectFit: 'contain' }}
              />
            ) : (
              <OutlinedImageIcon
                data-testid={`${testId}-empty`}
                style={{
                  color: isDark
                    ? 'var(--pf-t--global--icon--color--inverse)'
                    : 'var(--pf-t--global--icon--color--subtle)',
                  opacity: 0.6,
                }}
              />
            )}
          </Flex>
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Stack>
          <StackItem>
            <Content component="small">{isDark ? 'dark' : 'light'} theme</Content>
          </StackItem>
          <StackItem>
            <Content
              component="small"
              style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
            >
              {captionText}
            </Content>
          </StackItem>
        </Stack>
      </FlexItem>
    </Flex>
  );
};

type IconTableRowProps = {
  icon: MCPIcon;
  index: number;
  hasError: boolean;
  touched: boolean;
  onChangeSrc: (index: number, value: string) => void;
  onChangeTheme: (index: number, key: ThemeKey) => void;
  onBlurSrc: (index: number) => void;
  onRemove: (index: number) => void;
};

const IconTableRow: React.FC<IconTableRowProps> = ({
  icon,
  index,
  hasError,
  touched,
  onChangeSrc,
  onChangeTheme,
  onBlurSrc,
  onRemove,
}) => {
  const isEmpty = !icon.src.trim();
  const isInvalidUrl = !isEmpty && !sanitizeHref(icon.src);
  // Only show the "required"/format error once the field has been blurred, so a freshly
  // added row doesn't immediately flash an error before the user has typed anything.
  const showFormatError = (isEmpty || isInvalidUrl) && touched;
  const validated = showFormatError || hasError ? 'error' : 'default';

  return (
    <Tr data-testid={`mcp-register-icon-row-${index}`}>
      <Td dataLabel="Icon URL" className="pf-v6-u-pl-0">
        <Stack>
          <StackItem>
            <TextInput
              aria-label={`Icon URL ${index + 1}`}
              placeholder={ICON_URL_PLACEHOLDER}
              value={icon.src}
              validated={validated}
              onChange={(_event, value) => onChangeSrc(index, value)}
              onBlur={() => onBlurSrc(index)}
              data-testid={`mcp-register-icon-url-${index}`}
            />
          </StackItem>
          {showFormatError ? (
            <StackItem>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    {isEmpty ? 'Enter a valid URL' : 'URL must start with https://'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </StackItem>
          ) : null}
          {!isEmpty && !isInvalidUrl && hasError ? (
            <StackItem>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    Image failed to load
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </StackItem>
          ) : null}
        </Stack>
      </Td>
      <Td dataLabel="Theme">
        <SimpleSelect
          isFullWidth
          dataTestId={`mcp-register-icon-theme-${index}`}
          value={icon.theme ?? 'any'}
          options={THEME_OPTIONS}
          onChange={(key) => {
            if (key === 'any' || key === 'light' || key === 'dark') {
              onChangeTheme(index, key);
            }
          }}
        />
      </Td>
      <Td isActionCell className="pf-v6-u-pr-0 pf-v6-u-text-align-end">
        <Tooltip content="Remove icon">
          <Button
            variant="plain"
            aria-label="Remove icon"
            icon={<MinusCircleIcon />}
            onClick={() => onRemove(index)}
            data-testid={`mcp-register-icon-remove-${index}`}
          />
        </Tooltip>
      </Td>
    </Tr>
  );
};

const McpServerIconsField: React.FC<McpServerIconsFieldProps> = ({
  icons,
  onChange,
  serverJsonIcons = [],
}) => {
  const [failedSrcs, setFailedSrcs] = React.useState<Set<string>>(new Set());
  const [touchedIndices, setTouchedIndices] = React.useState<Set<number>>(new Set());

  const lightIcon = React.useMemo(() => resolveIcon(icons, false), [icons]);
  const darkIcon = React.useMemo(() => resolveIcon(icons, true), [icons]);
  const lightFallbackIcon = React.useMemo(
    () => resolveIcon(serverJsonIcons, false),
    [serverJsonIcons],
  );
  const darkFallbackIcon = React.useMemo(
    () => resolveIcon(serverJsonIcons, true),
    [serverJsonIcons],
  );

  const handleBlurSrc = (index: number) => {
    setTouchedIndices((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  };

  const handleSrcChange = (index: number, value: string) => {
    setFailedSrcs((prev) => {
      if (!prev.has(icons[index].src)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(icons[index].src);
      return next;
    });
    onChange(icons.map((icon, i) => (i === index ? { ...icon, src: value } : icon)));
  };

  const handleThemeChange = (index: number, key: ThemeKey) => {
    onChange(
      icons.map((icon, i) => {
        if (i !== index) {
          return icon;
        }
        const theme = themeKeyToValue(key);
        if (theme) {
          return { ...icon, theme };
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { theme: removedTheme, ...rest } = icon;
        return rest;
      }),
    );
  };

  const handleAdd = () => {
    onChange([...icons, { src: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(icons.filter((_, i) => i !== index));
    setTouchedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) {
          next.add(i);
        } else if (i > index) {
          next.add(i - 1);
        }
      });
      return next;
    });
  };

  const handleLoadError = (failedSrc: string) => {
    setFailedSrcs((prev) => {
      if (prev.has(failedSrc)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(failedSrc);
      return next;
    });
  };

  return (
    <FormGroup
      label="Icons"
      fieldId="mcp-register-icons"
      labelHelp={<FieldGroupHelpLabelIcon content={ICON_HELP} />}
    >
      <Panel variant="bordered" data-testid="mcp-register-icons-panel" style={ICONS_PANEL_STYLE}>
        <PanelMain>
          <PanelMainBody>
            <Stack hasGutter>
              <StackItem>
                <Table
                  data-testid="mcp-register-icons-table"
                  variant="compact"
                  borders={false}
                  gridBreakPoint=""
                  columns={ICON_COLUMNS}
                  data={icons}
                  rowRenderer={(icon, index) => (
                    <IconTableRow
                      key={index}
                      icon={icon}
                      index={index}
                      hasError={failedSrcs.has(icon.src)}
                      touched={touchedIndices.has(index)}
                      onChangeSrc={handleSrcChange}
                      onChangeTheme={handleThemeChange}
                      onBlurSrc={handleBlurSrc}
                      onRemove={handleRemove}
                    />
                  )}
                />
                <Button
                  data-testid="mcp-register-icon-add"
                  variant="link"
                  icon={<PlusCircleIcon />}
                  isInline
                  onClick={handleAdd}
                  className={icons.length > 0 ? 'pf-v6-u-mt-sm' : undefined}
                >
                  Add icon
                </Button>
              </StackItem>

              <StackItem>
                <Content component="small" className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">
                  Preview
                </Content>
                <Flex
                  gap={{ default: 'gapLg' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  className="pf-v6-u-p-md"
                  style={{
                    backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
                    borderRadius: 'var(--pf-t--global--border--radius--medium)',
                  }}
                >
                  <FlexItem>
                    <IconPreviewItem
                      isDark={false}
                      icon={lightIcon}
                      fallbackIcon={lightFallbackIcon}
                      testId="mcp-register-icon-preview-light"
                      onLoadError={handleLoadError}
                    />
                  </FlexItem>
                  <FlexItem>
                    <IconPreviewItem
                      isDark
                      icon={darkIcon}
                      fallbackIcon={darkFallbackIcon}
                      testId="mcp-register-icon-preview-dark"
                      onLoadError={handleLoadError}
                    />
                  </FlexItem>
                </Flex>
              </StackItem>
            </Stack>
          </PanelMainBody>
        </PanelMain>
      </Panel>
    </FormGroup>
  );
};

export default McpServerIconsField;
