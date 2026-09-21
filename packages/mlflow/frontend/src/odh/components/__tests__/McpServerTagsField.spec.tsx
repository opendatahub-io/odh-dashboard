import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import McpServerTagsField from '~/odh/components/McpServerTagsField';
import { mockMcpTagEntry } from '~/__mocks__/mockMcpRegistry';
import type { MCPTagEntry } from '~/odh/types/mcpRegistryTypes';

const Wrapper: React.FC<{ initialTags?: MCPTagEntry[] }> = ({
  initialTags = [mockMcpTagEntry({ key: '', value: '' })],
}) => {
  const [tags, setTags] = React.useState<MCPTagEntry[]>(initialTags);
  return <McpServerTagsField tags={tags} onChange={setTags} />;
};

describe('McpServerTagsField', () => {
  it('should render a plain table so the modal background shows through', () => {
    render(<Wrapper />);

    expect(screen.getByTestId('mcp-register-tags-table')).toHaveClass('pf-m-plain');
  });

  it('should not show a value error while typing a key', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.type(screen.getByTestId('mcp-register-tag-key-0'), 'team');

    expect(screen.queryByText('Enter a value')).not.toBeInTheDocument();
  });

  it('should show a value error on blur when the key is set and the value is empty', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const keyInput = screen.getByTestId('mcp-register-tag-key-0');
    await user.type(keyInput, 'team');
    fireEvent.blur(keyInput);

    expect(screen.getByText('Enter a value')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-register-tag-value-0')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should hide the value error while typing and show it again on blur', async () => {
    const user = userEvent.setup();
    render(<Wrapper initialTags={[mockMcpTagEntry({ value: '' })]} />);

    const valueInput = screen.getByTestId('mcp-register-tag-value-0');
    fireEvent.blur(valueInput);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();

    await user.type(valueInput, 'p');
    expect(screen.queryByText('Enter a value')).not.toBeInTheDocument();

    await user.clear(valueInput);
    fireEvent.blur(valueInput);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();
  });

  it('should not error an empty row on blur', () => {
    render(<Wrapper />);

    fireEvent.blur(screen.getByTestId('mcp-register-tag-key-0'));
    fireEvent.blur(screen.getByTestId('mcp-register-tag-value-0'));

    expect(screen.queryByText('Enter a key')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a value')).not.toBeInTheDocument();
  });

  it('should show a key error on blur when the value is set and the key is empty', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.type(screen.getByTestId('mcp-register-tag-value-0'), 'platform');
    fireEvent.blur(screen.getByTestId('mcp-register-tag-value-0'));

    expect(screen.getByText('Enter a key')).toBeInTheDocument();
  });

  it('should ignore blur after the tag row has been removed', () => {
    const onChange = jest.fn();
    const tags = [
      mockMcpTagEntry({ key: 'team', value: 'platform' }),
      mockMcpTagEntry({ key: 'env', value: 'prod' }),
    ];
    const { rerender } = render(<McpServerTagsField tags={tags} onChange={onChange} />);
    const secondKey = screen.getByTestId('mcp-register-tag-key-1');

    fireEvent.click(screen.getByTestId('mcp-register-tag-remove-1'));
    rerender(<McpServerTagsField tags={tags.slice(0, 1)} onChange={onChange} />);

    expect(() => fireEvent.blur(secondKey)).not.toThrow();
  });
});
