import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import McpServerIconsField, {
  type McpServerIconsFieldStatus,
} from '~/odh/components/McpServerIconsField';
import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';
import { mockMcpIcon } from '~/__mocks__/mockMcpRegistry';

type PreviewTheme = 'light' | 'dark';
type WrapperProps = {
  initialIcons?: MCPIcon[];
  officialIcons?: MCPIcon[];
  onStatusChange?: (status: McpServerIconsFieldStatus) => void;
};

const emptyIcon = () => mockMcpIcon({ src: '' });
const brokenIcon = () => mockMcpIcon({ src: 'https://example.com/broken.svg' });
const officialIcon = () => mockMcpIcon({ src: 'https://example.com/official.svg' });
const lightIcon = () => mockMcpIcon({ src: 'https://example.com/light.svg', theme: 'light' });
const darkIcon = () => mockMcpIcon({ src: 'https://example.com/dark.svg', theme: 'dark' });

const Wrapper: React.FC<WrapperProps> = ({ initialIcons = [], officialIcons, onStatusChange }) => {
  const [icons, setIcons] = React.useState<MCPIcon[]>(initialIcons);
  return (
    <McpServerIconsField
      icons={icons}
      onChange={setIcons}
      officialIcons={officialIcons}
      onStatusChange={onStatusChange}
    />
  );
};

const renderField = (props: WrapperProps = {}) => render(<Wrapper {...props} />);

const urlInput = (index = 0) => screen.getByTestId(`mcp-register-icon-url-${index}`);
const queryUrlInput = (index = 0) => screen.queryByTestId(`mcp-register-icon-url-${index}`);
const previewImg = (theme: PreviewTheme) =>
  screen.getByTestId(`mcp-register-icon-preview-${theme}-img`);
const queryPreviewImg = (theme: PreviewTheme) =>
  screen.queryByTestId(`mcp-register-icon-preview-${theme}-img`);
const previewEmpty = (theme: PreviewTheme) =>
  screen.getByTestId(`mcp-register-icon-preview-${theme}-empty`);
const previewSwatch = (theme: PreviewTheme) =>
  screen.getByTestId(`mcp-register-icon-preview-${theme}-swatch`);

const firePreviewLoad = (theme: PreviewTheme) => {
  fireEvent.load(previewImg(theme));
};
const firePreviewError = (theme: PreviewTheme) => {
  fireEvent.error(previewImg(theme));
};
const settlePreviews = () => {
  firePreviewLoad('light');
  firePreviewLoad('dark');
};
const failBothPreviews = () => {
  firePreviewError('light');
  firePreviewError('dark');
};

describe('McpServerIconsField', () => {
  describe('empty state', () => {
    it('should render no rows and the McpIcon fallback when there are no icons', () => {
      renderField();

      expect(queryUrlInput()).not.toBeInTheDocument();
      expect(queryPreviewImg('light')).not.toBeInTheDocument();
      expect(previewEmpty('light')).toBeInTheDocument();
      expect(screen.getAllByText('No icon set')).toHaveLength(2);
    });

    it('should keep light and dark preview swatches theme-stable', () => {
      renderField();

      expect(previewSwatch('light')).toHaveStyle({
        backgroundColor: 'var(--pf-t--global--background--color--100)',
        color: 'var(--pf-t--global--icon--color--200)',
      });
      expect(previewSwatch('dark')).toHaveStyle({
        backgroundColor: 'var(--pf-t--global--background--color--400)',
        color: 'var(--pf-t--global--icon--color--300)',
      });
    });
  });

  describe('rows', () => {
    it('should add a new empty, immediately-editable row when Add icon is clicked, with no error until blurred', async () => {
      const user = userEvent.setup();
      renderField();

      await user.click(screen.getByTestId('mcp-register-icon-add'));

      expect(urlInput()).toHaveValue('');
      expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();

      fireEvent.blur(urlInput());

      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
    });

    it('should update the row value as the user types, with no blur required', async () => {
      const user = userEvent.setup();
      renderField({ initialIcons: [emptyIcon()] });

      await user.type(urlInput(), 'https://example.com/icon.svg');

      expect(urlInput()).toHaveValue('https://example.com/icon.svg');
      expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();
    });

    it('should type into the newly added row without corrupting an earlier, already-filled row', async () => {
      const user = userEvent.setup();
      renderField({
        initialIcons: [mockMcpIcon({ src: 'https://example.com/existing.svg' })],
      });

      await user.click(screen.getByTestId('mcp-register-icon-add'));

      expect(urlInput(1)).toHaveValue('');

      await user.type(urlInput(1), 'https://example.com/new.svg');

      expect(urlInput()).toHaveValue('https://example.com/existing.svg');
      expect(urlInput(1)).toHaveValue('https://example.com/new.svg');
    });

    it('should remove a row immediately when the remove button is clicked', async () => {
      const user = userEvent.setup();
      renderField({
        initialIcons: [
          mockMcpIcon({ src: 'https://example.com/a.svg' }),
          mockMcpIcon({ src: 'https://example.com/b.svg' }),
        ],
      });

      await user.click(screen.getByTestId('mcp-register-icon-remove-0'));

      expect(urlInput()).toHaveValue('https://example.com/b.svg');
      expect(queryUrlInput(1)).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should show a format error for a non-empty value that is not an http(s) URL', () => {
      renderField({ initialIcons: [mockMcpIcon({ src: 'not-a-url' })] });

      fireEvent.blur(urlInput());

      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
    });

    it('should show a format error for an incomplete http(s) scheme', () => {
      renderField({ initialIcons: [mockMcpIcon({ src: 'https://' })] });

      fireEvent.blur(urlInput());

      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
    });

    it('should accept an http URL (local catalog logo endpoints)', () => {
      renderField({
        initialIcons: [mockMcpIcon({ src: 'http://localhost:4010/model-registry/api/v1/logo' })],
      });

      fireEvent.blur(urlInput());

      expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();
    });

    it('should hide the format error while typing and show it again on blur', async () => {
      const user = userEvent.setup();
      renderField({ initialIcons: [emptyIcon()] });

      fireEvent.blur(urlInput());
      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();

      await user.type(urlInput(), 'not-a-url');
      expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();

      fireEvent.blur(urlInput());
      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
    });

    it('should only show the required error for the row that was blurred', async () => {
      const user = userEvent.setup();
      renderField();

      await user.click(screen.getByTestId('mcp-register-icon-add'));
      await user.click(screen.getByTestId('mcp-register-icon-add'));

      fireEvent.blur(urlInput());

      expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
      expect(urlInput(1)).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('should keep the correct row marked as touched after an earlier row is removed', async () => {
      const user = userEvent.setup();
      renderField();

      await user.click(screen.getByTestId('mcp-register-icon-add'));
      await user.click(screen.getByTestId('mcp-register-icon-add'));
      await user.click(screen.getByTestId('mcp-register-icon-add'));

      // Touch the middle row only.
      fireEvent.blur(urlInput(1));
      expect(screen.getAllByText('Enter a valid URL')).toHaveLength(1);

      // Remove the first (untouched) row; the touched row shifts from index 1 to index 0.
      await user.click(screen.getByTestId('mcp-register-icon-remove-0'));

      expect(screen.getAllByText('Enter a valid URL')).toHaveLength(1);
      expect(urlInput()).toHaveAttribute('aria-invalid', 'true');
      expect(urlInput(1)).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('preview', () => {
    it('should set the theme on a row when a theme option is selected', async () => {
      const user = userEvent.setup();
      renderField({ initialIcons: [mockMcpIcon()] });

      await user.click(screen.getByTestId('mcp-register-icon-theme-0'));
      await user.click(screen.getByTestId('dark'));

      expect(previewImg('dark')).toHaveAttribute('src', mockMcpIcon().src);
    });

    it('should preview the light and dark themed icons independently', () => {
      renderField({ initialIcons: [lightIcon(), darkIcon()] });

      expect(previewImg('light')).toHaveAttribute('src', lightIcon().src);
      expect(previewImg('dark')).toHaveAttribute('src', darkIcon().src);
    });

    it('should caption an explicitly-set icon as "Custom icon" in the preview', () => {
      renderField({ initialIcons: [mockMcpIcon()] });

      // A theme-agnostic icon resolves for both the light and dark previews.
      expect(screen.getAllByText('Custom icon')).toHaveLength(2);
    });

    it('should show a row load-error message and fall back to McpIcon when a custom icon fails to load', () => {
      renderField({ initialIcons: [brokenIcon()] });

      expect(previewImg('light')).toHaveAttribute('src', brokenIcon().src);
      firePreviewError('light');

      expect(screen.getByText('Image failed to load')).toBeInTheDocument();
      expect(urlInput()).toHaveValue(brokenIcon().src);
      expect(queryPreviewImg('light')).not.toBeInTheDocument();
      expect(previewEmpty('light')).toBeInTheDocument();
    });
  });

  describe('official icons', () => {
    it('should caption a user-added URL as Official when it matches the official icon URL', () => {
      renderField({ initialIcons: [mockMcpIcon()], officialIcons: [mockMcpIcon()] });

      expect(urlInput()).toHaveValue(mockMcpIcon().src);
      expect(screen.getAllByText('Official icon')).toHaveLength(2);
      expect(screen.queryByText('Custom icon')).not.toBeInTheDocument();
    });

    it('should show the official icon in preview only (no editable row) when the icons list is empty', () => {
      renderField({ officialIcons: [mockMcpIcon()] });

      expect(queryUrlInput()).not.toBeInTheDocument();
      expect(screen.getAllByText('Official icon')).toHaveLength(2);
      expect(screen.queryByText('Custom icon')).not.toBeInTheDocument();
      expect(previewImg('light')).toHaveAttribute('src', mockMcpIcon().src);
    });

    it('should caption a committed custom URL as Custom icon after blur', async () => {
      const user = userEvent.setup();
      renderField({ initialIcons: [emptyIcon()], officialIcons: [mockMcpIcon()] });

      await user.type(urlInput(), 'https://example.com/edited.svg');
      expect(screen.queryByText('Custom icon')).not.toBeInTheDocument();

      fireEvent.blur(urlInput());

      expect(screen.getAllByText('Custom icon')).toHaveLength(2);
      expect(screen.queryByText('Official icon')).not.toBeInTheDocument();
    });

    it('should keep the official preview image and caption while typing an uncommitted URL', async () => {
      const user = userEvent.setup();
      renderField({ initialIcons: [emptyIcon()], officialIcons: [mockMcpIcon()] });

      expect(screen.getAllByText('Official icon')).toHaveLength(2);

      await user.type(urlInput(), 'https://example.com/custom.svg');

      expect(urlInput()).toHaveValue('https://example.com/custom.svg');
      expect(screen.getAllByText('Official icon')).toHaveLength(2);
      expect(screen.queryByText('Custom icon')).not.toBeInTheDocument();
      expect(previewImg('light')).toHaveAttribute('src', mockMcpIcon().src);
    });

    it('should fall back to McpIcon when the official preview icon fails to load', () => {
      renderField({ officialIcons: [brokenIcon()] });

      expect(previewImg('light')).toHaveAttribute('src', brokenIcon().src);
      firePreviewError('light');

      expect(queryUrlInput()).not.toBeInTheDocument();
      expect(previewEmpty('light')).toBeInTheDocument();
      expect(screen.getAllByText('No icon set')).toHaveLength(2);
    });

    it('should fall back to the official icon image when a custom icon fails to load', () => {
      renderField({ initialIcons: [brokenIcon()], officialIcons: [officialIcon()] });

      expect(previewImg('light')).toHaveAttribute('src', brokenIcon().src);
      failBothPreviews();

      expect(previewImg('light')).toHaveAttribute('src', officialIcon().src);
      expect(screen.getByText('Image failed to load')).toBeInTheDocument();
      expect(screen.getAllByText('Official icon')).toHaveLength(2);
      expect(screen.queryByText('Custom icon')).not.toBeInTheDocument();
    });
  });

  describe('status', () => {
    it('should settle immediately with an empty payload when there is nothing to load', () => {
      const onStatusChange = jest.fn();
      renderField({ onStatusChange });

      expect(onStatusChange).toHaveBeenCalledWith({
        settled: true,
        hasBlockingError: false,
        iconsForPayload: [],
      });
    });

    it('should not treat empty user rows as blocking', () => {
      const onStatusChange = jest.fn();
      renderField({ initialIcons: [emptyIcon()], onStatusChange });

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ hasBlockingError: false, iconsForPayload: [] }),
      );
    });

    it('should wait for both previews to load before settling, then include official in the payload', () => {
      const onStatusChange = jest.fn();
      renderField({ officialIcons: [mockMcpIcon()], onStatusChange });

      expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ settled: false }));

      firePreviewLoad('light');
      expect(onStatusChange.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({ settled: false }),
      );

      firePreviewLoad('dark');
      expect(onStatusChange).toHaveBeenCalledWith({
        settled: true,
        hasBlockingError: false,
        iconsForPayload: [mockMcpIcon()],
      });
    });

    it('should block when a user-added icon fails to load, while still falling back in preview', () => {
      const onStatusChange = jest.fn();
      renderField({
        initialIcons: [brokenIcon()],
        officialIcons: [officialIcon()],
        onStatusChange,
      });

      expect(previewImg('light')).toHaveAttribute('src', brokenIcon().src);
      failBothPreviews();
      settlePreviews();

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hasBlockingError: true,
          iconsForPayload: [officialIcon()],
        }),
      );
    });

    it('should include a loaded light user icon plus official for the uncovered dark theme', () => {
      const onStatusChange = jest.fn();
      renderField({
        initialIcons: [lightIcon()],
        officialIcons: [officialIcon()],
        onStatusChange,
      });

      settlePreviews();

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          settled: true,
          hasBlockingError: false,
          iconsForPayload: [lightIcon(), officialIcon()],
        }),
      );
    });
  });
});
