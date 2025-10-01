import { renderHook, act } from '@testing-library/react';
import useAccordionState from '~/app/Chatbot/hooks/useAccordionState';

// Mock the constants
jest.mock('~/app/Chatbot/const', () => ({
  DEFAULT_EXPANDED_ACCORDION_ITEMS: ['model-details-item'],
  ACCORDION_ITEMS: {
    MODEL_DETAILS: 'model-details-item',
    RAG: 'sources-item',
    MCP_SERVERS: 'mcp-servers-item',
  },
}));

describe('useAccordionState', () => {
  it('should initialize with default expanded accordion items', () => {
    const { result } = renderHook(() => useAccordionState());

    expect(result.current.expandedAccordionItems).toEqual(['model-details-item']);
  });

  it('should toggle an accordion item to collapsed when it is currently expanded', () => {
    const { result } = renderHook(() => useAccordionState());

    // Initially, 'model-details-item' is expanded
    expect(result.current.expandedAccordionItems).toContain('model-details-item');

    // Toggle it to collapse
    act(() => {
      result.current.onAccordionToggle('model-details-item');
    });

    expect(result.current.expandedAccordionItems).not.toContain('model-details-item');
    expect(result.current.expandedAccordionItems).toEqual([]);
  });

  it('should toggle an accordion item to expanded when it is currently collapsed', () => {
    const { result } = renderHook(() => useAccordionState());

    // Initially, 'sources-item' is not expanded
    expect(result.current.expandedAccordionItems).not.toContain('sources-item');

    // Toggle it to expand
    act(() => {
      result.current.onAccordionToggle('sources-item');
    });

    expect(result.current.expandedAccordionItems).toContain('sources-item');
    expect(result.current.expandedAccordionItems).toEqual(['model-details-item', 'sources-item']);
  });

  it('should handle multiple accordion items being expanded', () => {
    const { result } = renderHook(() => useAccordionState());

    // Expand sources-item
    act(() => {
      result.current.onAccordionToggle('sources-item');
    });

    // Expand mcp-servers-item
    act(() => {
      result.current.onAccordionToggle('mcp-servers-item');
    });

    expect(result.current.expandedAccordionItems).toEqual([
      'model-details-item',
      'sources-item',
      'mcp-servers-item',
    ]);
  });

  it('should handle toggling multiple items back and forth', () => {
    const { result } = renderHook(() => useAccordionState());

    // Start with default: ['model-details-item']
    expect(result.current.expandedAccordionItems).toEqual(['model-details-item']);

    // Add sources-item
    act(() => {
      result.current.onAccordionToggle('sources-item');
    });
    expect(result.current.expandedAccordionItems).toEqual(['model-details-item', 'sources-item']);

    // Remove model-details-item
    act(() => {
      result.current.onAccordionToggle('model-details-item');
    });
    expect(result.current.expandedAccordionItems).toEqual(['sources-item']);

    // Add model-details-item back
    act(() => {
      result.current.onAccordionToggle('model-details-item');
    });
    expect(result.current.expandedAccordionItems).toEqual(['sources-item', 'model-details-item']);

    // Remove sources-item
    act(() => {
      result.current.onAccordionToggle('sources-item');
    });
    expect(result.current.expandedAccordionItems).toEqual(['model-details-item']);
  });

  it('should handle toggling an unknown accordion item', () => {
    const { result } = renderHook(() => useAccordionState());

    // Toggle an unknown item
    act(() => {
      result.current.onAccordionToggle('unknown-item');
    });

    expect(result.current.expandedAccordionItems).toEqual(['model-details-item', 'unknown-item']);
  });
});
