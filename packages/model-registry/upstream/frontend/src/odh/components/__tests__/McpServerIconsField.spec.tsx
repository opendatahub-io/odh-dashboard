import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import McpServerIconsField from '~/odh/components/McpServerIconsField';
import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';

const Wrapper: React.FC<{ initialIcons?: MCPIcon[]; serverJsonIcons?: MCPIcon[] }> = ({
  initialIcons = [],
  serverJsonIcons,
}) => {
  const [icons, setIcons] = React.useState<MCPIcon[]>(initialIcons);
  return (
    <McpServerIconsField icons={icons} onChange={setIcons} serverJsonIcons={serverJsonIcons} />
  );
};

describe('McpServerIconsField', () => {
  it('should render no rows and a placeholder preview when there are no icons', () => {
    render(<Wrapper />);
    expect(screen.queryByTestId('mcp-register-icon-url-0')).not.toBeInTheDocument();

    const lightPreview = screen.getByTestId('mcp-register-icon-preview-light');
    expect(lightPreview.querySelector('img')).not.toBeInTheDocument();
    expect(
      lightPreview.querySelector('[data-testid="mcp-register-icon-preview-light-empty"]'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No icon set')).toHaveLength(2);
  });

  it('should add a new empty, immediately-editable row when Add icon is clicked, with no error until blurred', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId('mcp-register-icon-add'));

    const input = screen.getByTestId('mcp-register-icon-url-0');
    expect(input).toHaveValue('');
    expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();

    fireEvent.blur(input);

    expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
  });

  it('should update the row value as the user types, with no blur required', async () => {
    const user = userEvent.setup();
    render(<Wrapper initialIcons={[{ src: '' }]} />);

    const input = screen.getByTestId('mcp-register-icon-url-0');
    await user.type(input, 'https://example.com/icon.svg');

    expect(input).toHaveValue('https://example.com/icon.svg');
    expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();
  });

  it('should show a format error for a non-empty value that is not an https URL', async () => {
    render(<Wrapper initialIcons={[{ src: 'not-a-url' }]} />);

    const input = screen.getByTestId('mcp-register-icon-url-0');
    fireEvent.blur(input);

    expect(screen.getByText('URL must start with https://')).toBeInTheDocument();
    expect(screen.queryByText('Enter a valid URL')).not.toBeInTheDocument();
  });

  it('should show a format error for an http (non-https) URL', async () => {
    render(<Wrapper initialIcons={[{ src: 'http://example.com/icon.svg' }]} />);

    const input = screen.getByTestId('mcp-register-icon-url-0');
    fireEvent.blur(input);

    expect(screen.getByText('URL must start with https://')).toBeInTheDocument();
  });

  it('should type into the newly added row without corrupting an earlier, already-filled row', async () => {
    const user = userEvent.setup();
    render(<Wrapper initialIcons={[{ src: 'https://example.com/existing.svg' }]} />);

    await user.click(screen.getByTestId('mcp-register-icon-add'));

    const newRowInput = screen.getByTestId('mcp-register-icon-url-1');
    expect(newRowInput).toHaveValue('');

    await user.type(newRowInput, 'https://example.com/new.svg');

    expect(screen.getByTestId('mcp-register-icon-url-0')).toHaveValue(
      'https://example.com/existing.svg',
    );
    expect(screen.getByTestId('mcp-register-icon-url-1')).toHaveValue(
      'https://example.com/new.svg',
    );
  });

  it('should only show the required error for the row that was blurred', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId('mcp-register-icon-add'));
    await user.click(screen.getByTestId('mcp-register-icon-add'));

    fireEvent.blur(screen.getByTestId('mcp-register-icon-url-0'));

    expect(screen.getByText('Enter a valid URL')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-register-icon-url-1')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('should keep the correct row marked as touched after an earlier row is removed', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByTestId('mcp-register-icon-add'));
    await user.click(screen.getByTestId('mcp-register-icon-add'));
    await user.click(screen.getByTestId('mcp-register-icon-add'));

    // Touch the middle row only.
    fireEvent.blur(screen.getByTestId('mcp-register-icon-url-1'));
    expect(screen.getAllByText('Enter a valid URL')).toHaveLength(1);

    // Remove the first (untouched) row; the touched row shifts from index 1 to index 0.
    await user.click(screen.getByTestId('mcp-register-icon-remove-0'));

    expect(screen.getAllByText('Enter a valid URL')).toHaveLength(1);
    expect(screen.getByTestId('mcp-register-icon-url-0')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('mcp-register-icon-url-1')).toHaveAttribute('aria-invalid', 'false');
  });

  it('should set the theme on a row when a theme option is selected', async () => {
    const user = userEvent.setup();
    render(<Wrapper initialIcons={[{ src: 'https://example.com/icon.svg' }]} />);

    await user.click(screen.getByTestId('mcp-register-icon-theme-0'));
    await user.click(screen.getByTestId('dark'));

    expect(
      screen.getByTestId('mcp-register-icon-preview-dark').querySelector('img'),
    ).toHaveAttribute('src', 'https://example.com/icon.svg');
  });

  it('should remove a row immediately when the remove button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper
        initialIcons={[{ src: 'https://example.com/a.svg' }, { src: 'https://example.com/b.svg' }]}
      />,
    );

    await user.click(screen.getByTestId('mcp-register-icon-remove-0'));

    expect(screen.getByTestId('mcp-register-icon-url-0')).toHaveValue('https://example.com/b.svg');
    expect(screen.queryByTestId('mcp-register-icon-url-1')).not.toBeInTheDocument();
  });

  it('should preview the light and dark themed icons independently', () => {
    render(
      <Wrapper
        initialIcons={[
          { src: 'https://example.com/light.svg', theme: 'light' },
          { src: 'https://example.com/dark.svg', theme: 'dark' },
        ]}
      />,
    );

    expect(
      screen.getByTestId('mcp-register-icon-preview-light').querySelector('img'),
    ).toHaveAttribute('src', 'https://example.com/light.svg');
    expect(
      screen.getByTestId('mcp-register-icon-preview-dark').querySelector('img'),
    ).toHaveAttribute('src', 'https://example.com/dark.svg');
  });

  it('should fall back to the server.json icon for preview when no explicit icon matches', () => {
    render(
      <Wrapper
        initialIcons={[]}
        serverJsonIcons={[{ src: 'https://example.com/from-server-json.svg' }]}
      />,
    );

    expect(
      screen.getByTestId('mcp-register-icon-preview-light').querySelector('img'),
    ).toHaveAttribute('src', 'https://example.com/from-server-json.svg');
    expect(screen.getAllByText('From server.json')).toHaveLength(2);
  });

  it('should caption an explicitly-set icon as "Custom icon" in the preview', () => {
    render(<Wrapper initialIcons={[{ src: 'https://example.com/icon.svg' }]} />);

    // A theme-agnostic icon resolves for both the light and dark previews.
    expect(screen.getAllByText('Custom icon')).toHaveLength(2);
  });

  it('should show a row load-error message and fall back to the server.json icon in the preview when the explicit icon image fails to load', () => {
    render(
      <Wrapper
        initialIcons={[{ src: 'https://example.com/broken.svg' }]}
        serverJsonIcons={[{ src: 'https://example.com/from-server-json.svg' }]}
      />,
    );

    const img = screen.getByTestId('mcp-register-icon-preview-light').querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/broken.svg');
    if (img) {
      fireEvent.error(img);
    }

    expect(screen.getByText('Image failed to load')).toBeInTheDocument();
    expect(
      screen.getByTestId('mcp-register-icon-preview-light').querySelector('img'),
    ).toHaveAttribute('src', 'https://example.com/from-server-json.svg');
  });
});
