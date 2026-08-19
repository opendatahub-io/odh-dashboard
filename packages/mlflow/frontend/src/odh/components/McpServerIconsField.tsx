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
import { ExclamationCircleIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import type { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { Table, type SortableData } from '@odh-dashboard/ui-core';
import { useIconFallback } from '~/odh/hooks/useIconFallback';
import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';
import {
  getIconUrlFormatError,
  hasBlockingUserIcon,
  resolveIcon,
  resolveIconsForSubmit,
  sanitizeIconPreviewSrc,
} from '~/odh/utils';

/** MCP brand mark used as the preview fallback when no other icon URL resolves. */
const McpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
    <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
      <path d="M10.459 1.562a1.725 1.725 0 0 0-2.407 0L1.635 7.855a.575.575 0 0 1-.925-.18.55.55 0 0 1 .123-.606L7.25.775a2.875 2.875 0 0 1 4.01 0 2.74 2.74 0 0 1 .803 2.36 2.87 2.87 0 0 1 2.406.787l.034.033a2.743 2.743 0 0 1 0 3.934L8.699 13.58a.18.18 0 0 0 0 .262l1.192 1.17a.55.55 0 0 1 0 .786.576.576 0 0 1-.802 0L7.897 14.63a1.28 1.28 0 0 1 0-1.836L13.7 7.101a1.645 1.645 0 0 0 0-2.36l-.034-.032a1.725 1.725 0 0 0-2.404-.002L6.48 9.397H6.48l-.065.065a.575.575 0 0 1-.926-.18.55.55 0 0 1 .123-.607l4.849-4.755a1.645 1.645 0 0 0-.002-2.358" />
      <path d="M9.657 3.135a.55.55 0 0 0 0-.786.575.575 0 0 0-.803 0L4.108 7.003a2.743 2.743 0 0 0 0 3.934 2.876 2.876 0 0 0 4.01 0l4.747-4.655a.55.55 0 0 0 0-.787.575.575 0 0 0-.802 0L7.317 10.15a1.725 1.725 0 0 1-2.407 0 1.647 1.647 0 0 1 0-2.36z" />
    </g>
  </svg>
);

const THEME_OPTIONS: SimpleSelectOption[] = [
  { key: 'any', label: 'Any' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

const ICON_HELP =
  "Set or override icons for this server. Use 'light' or 'dark' for theme-specific icons, or 'any' for one that works in both.";

const ICON_URL_PLACEHOLDER = 'https://example.com/icon.svg';

const ICONS_PANEL_STYLE: React.CSSProperties & Record<`--${string}`, string> = {
  '--pf-v6-c-panel--BorderRadius': 'var(--pf-t--global--border--radius--medium)',
};

const ICON_PREVIEW_SWATCH_STYLE: React.CSSProperties = {
  width: '2.75rem',
  height: '2.75rem',
  border: '1px solid var(--pf-t--global--border--color--default)',
  borderRadius: 'var(--pf-t--global--border--radius--small)',
};

const ICON_PREVIEW_SWATCH_THEME_STYLE: Record<'light' | 'dark', React.CSSProperties> = {
  light: {
    backgroundColor: 'var(--pf-t--global--background--color--100)',
    color: 'var(--pf-t--global--icon--color--200)',
  },
  dark: {
    backgroundColor: 'var(--pf-t--global--background--color--400)',
    color: 'var(--pf-t--global--icon--color--300)',
  },
};

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

type IconSource = 'explicit' | 'official' | 'default';

const SOURCE_CAPTIONS: Record<IconSource, string> = {
  explicit: 'Custom icon',
  official: 'Official icon',
  default: 'No icon set',
};

const EMPTY_OFFICIAL_ICONS: MCPIcon[] = [];

type ThemeKey = 'any' | 'light' | 'dark';

const isThemeKey = (key: string): key is ThemeKey =>
  key === 'any' || key === 'light' || key === 'dark';

export type McpServerIconsFieldStatus = {
  settled: boolean;
  hasBlockingError: boolean;
  iconsForPayload: MCPIcon[];
};

type McpServerIconsFieldProps = {
  icons: MCPIcon[];
  onChange: (icons: MCPIcon[]) => void;
  officialIcons?: MCPIcon[];
  onStatusChange?: (status: McpServerIconsFieldStatus) => void;
};

const IconUrlError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StackItem>
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
          {children}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </StackItem>
);

type IconPreviewItemProps = {
  isDark: boolean;
  icon: MCPIcon | undefined;
  fallbackIcon: MCPIcon | undefined;
  officialIcon: MCPIcon | undefined;
  testId: string;
  onLoadError: (failedSrc: string) => void;
  onLoadSuccess: (loadedSrc: string) => void;
  onSettledChange: (settled: boolean) => void;
};

const IconPreviewItem: React.FC<IconPreviewItemProps> = ({
  isDark,
  icon,
  fallbackIcon,
  officialIcon,
  testId,
  onLoadError,
  onLoadSuccess,
  onSettledChange,
}) => {
  const sanitizedPrimary = sanitizeIconPreviewSrc(icon?.src);
  const sanitizedFallback = sanitizeIconPreviewSrc(fallbackIcon?.src);
  const { activeSrc, onError: onIconError } = useIconFallback(sanitizedPrimary, sanitizedFallback);
  const [loadedSrc, setLoadedSrc] = React.useState<string | undefined>();
  const [seenActiveSrc, setSeenActiveSrc] = React.useState(activeSrc);
  if (activeSrc !== seenActiveSrc) {
    setSeenActiveSrc(activeSrc);
    setLoadedSrc(undefined);
  }
  const settled = !activeSrc || loadedSrc === activeSrc;
  React.useEffect(() => {
    onSettledChange(settled);
  }, [settled, onSettledChange]);

  const sanitizedOfficial = sanitizeIconPreviewSrc(officialIcon?.src);
  const source: IconSource = !activeSrc
    ? 'default'
    : sanitizedOfficial && activeSrc === sanitizedOfficial
      ? 'official'
      : 'explicit';

  const captionText = SOURCE_CAPTIONS[source];
  const tooltipBySource: Record<IconSource, string> = {
    default: captionText,
    explicit: activeSrc ?? '',
    official: `${captionText}: ${activeSrc}`,
  };

  const notifyLoadResult = (callback: (src: string) => void) => {
    if (activeSrc === sanitizedPrimary && icon?.src) {
      callback(icon.src);
    } else if (activeSrc === sanitizedFallback && fallbackIcon?.src) {
      callback(fallbackIcon.src);
    }
  };

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      gap={{ default: 'gapSm' }}
      data-testid={testId}
    >
      <FlexItem>
        <Tooltip content={tooltipBySource[source]}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentCenter' }}
            className="pf-v6-u-p-sm"
            data-testid={`${testId}-swatch`}
            style={{
              ...ICON_PREVIEW_SWATCH_STYLE,
              ...ICON_PREVIEW_SWATCH_THEME_STYLE[isDark ? 'dark' : 'light'],
            }}
          >
            {activeSrc ? (
              <img
                src={activeSrc}
                alt=""
                referrerPolicy="no-referrer"
                data-testid={`${testId}-img`}
                onLoad={() => {
                  setLoadedSrc(activeSrc);
                  notifyLoadResult(onLoadSuccess);
                }}
                onError={() => {
                  notifyLoadResult(onLoadError);
                  onIconError();
                }}
                style={{ maxHeight: '1.75rem', maxWidth: '1.75rem', objectFit: 'contain' }}
              />
            ) : (
              <McpIcon data-testid={`${testId}-empty`} style={{ opacity: 0.6 }} />
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
  const [localSrc, setLocalSrc] = React.useState(icon.src);
  React.useEffect(() => {
    setLocalSrc(icon.src);
  }, [icon.src]);

  const isCommitted = localSrc === icon.src;
  const formatError = getIconUrlFormatError(localSrc);
  // Format errors wait for blur (commit). Hide them again while the user is typing.
  const showFormatError = isCommitted && touched && formatError !== undefined;
  const showLoadError = isCommitted && !formatError && hasError;
  const validated = showFormatError || showLoadError ? 'error' : 'default';

  return (
    <Tr data-testid={`mcp-register-icon-row-${index}`}>
      <Td dataLabel="Icon URL" className="pf-v6-u-pl-0">
        <Stack>
          <StackItem>
            <TextInput
              aria-label={`Icon URL ${index + 1}`}
              placeholder={ICON_URL_PLACEHOLDER}
              value={localSrc}
              validated={validated}
              onChange={(_event, value) => setLocalSrc(value)}
              onBlur={() => {
                if (localSrc !== icon.src) {
                  onChangeSrc(index, localSrc);
                }
                onBlurSrc(index);
              }}
              data-testid={`mcp-register-icon-url-${index}`}
            />
          </StackItem>
          {showFormatError && formatError ? <IconUrlError>{formatError}</IconUrlError> : null}
          {showLoadError ? <IconUrlError>Image failed to load</IconUrlError> : null}
        </Stack>
      </Td>
      <Td dataLabel="Theme">
        <SimpleSelect
          isFullWidth
          dataTestId={`mcp-register-icon-theme-${index}`}
          value={icon.theme ?? 'any'}
          options={THEME_OPTIONS}
          onChange={(key) => {
            if (isThemeKey(key)) {
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
  officialIcons = EMPTY_OFFICIAL_ICONS,
  onStatusChange,
}) => {
  const [failedSrcs, setFailedSrcs] = React.useState<Set<string>>(new Set());
  const [touchedIndices, setTouchedIndices] = React.useState<Set<number>>(new Set());
  const [lightSettled, setLightSettled] = React.useState(false);
  const [darkSettled, setDarkSettled] = React.useState(false);

  const iconsForPayload = React.useMemo(
    () => resolveIconsForSubmit(icons, officialIcons, failedSrcs),
    [icons, officialIcons, failedSrcs],
  );
  const hasBlockingError = hasBlockingUserIcon(icons, failedSrcs);
  const settled = lightSettled && darkSettled;

  React.useEffect(() => {
    onStatusChange?.({ settled, hasBlockingError, iconsForPayload });
  }, [settled, hasBlockingError, iconsForPayload, onStatusChange]);

  const lightIcon = resolveIcon(icons, false);
  const darkIcon = resolveIcon(icons, true);
  const usableOfficialIcons = officialIcons.filter(
    (icon) => !failedSrcs.has(icon.src) && sanitizeIconPreviewSrc(icon.src),
  );
  const lightOfficialIcon = resolveIcon(usableOfficialIcons, false);
  const darkOfficialIcon = resolveIcon(usableOfficialIcons, true);

  const setSrcFailed = (src: string, failed: boolean) => {
    setFailedSrcs((prev) => {
      if (prev.has(src) === failed) {
        return prev;
      }
      const next = new Set(prev);
      if (failed) {
        next.add(src);
      } else {
        next.delete(src);
      }
      return next;
    });
  };

  const handlePreviewLoadError = (src: string) => {
    setSrcFailed(src, true);
  };

  const handleBlurSrc = (index: number) => {
    setTouchedIndices((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  };

  const handleSrcChange = (index: number, value: string) => {
    setSrcFailed(icons[index].src, false);
    onChange(icons.map((icon, i) => (i === index ? { ...icon, src: value } : icon)));
  };

  const handleThemeChange = (index: number, key: ThemeKey) => {
    onChange(
      icons.map((icon, i) => {
        if (i !== index) {
          return icon;
        }
        // "Any" theme omits the field; rebuild so we don't need an unused binding.
        return key === 'any' ? { src: icon.src } : { ...icon, theme: key };
      }),
    );
  };

  const handleAdd = () => {
    onChange([...icons, { src: '' }]);
  };

  const handleRemove = (index: number) => {
    const removedSrc = icons[index].src;
    const remainingIcons = icons.filter((_, i) => i !== index);
    onChange(remainingIcons);
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
    setFailedSrcs((prev) => {
      if (!prev.has(removedSrc) || remainingIcons.some((icon) => icon.src === removedSrc)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(removedSrc);
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
                      fallbackIcon={lightOfficialIcon}
                      officialIcon={lightOfficialIcon}
                      testId="mcp-register-icon-preview-light"
                      onLoadError={handlePreviewLoadError}
                      onLoadSuccess={(src) => setSrcFailed(src, false)}
                      onSettledChange={setLightSettled}
                    />
                  </FlexItem>
                  <FlexItem>
                    <IconPreviewItem
                      isDark
                      icon={darkIcon}
                      fallbackIcon={darkOfficialIcon}
                      officialIcon={darkOfficialIcon}
                      testId="mcp-register-icon-preview-dark"
                      onLoadError={handlePreviewLoadError}
                      onLoadSuccess={(src) => setSrcFailed(src, false)}
                      onSettledChange={setDarkSettled}
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
