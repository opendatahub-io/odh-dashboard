/* eslint-disable camelcase */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatbotFileSearchResults from '~/app/Chatbot/ChatbotFileSearchResults';
import { FileSearchCallData } from '~/app/types';

const makeResult = (
  overrides: Partial<{
    score: number;
    text: string;
    file_id: string;
    filename: string;
  }> = {},
) => ({
  score: 0.85,
  text: 'Sample chunk text',
  file_id: 'file-1',
  filename: 'report.pdf',
  ...overrides,
});

const defaultFileSearchData: FileSearchCallData = {
  queries: ['What is RAG?'],
  results: [
    makeResult({ score: 0.9, filename: 'report.pdf', file_id: 'f1' }),
    makeResult({ score: 0.6, filename: 'report.pdf', file_id: 'f1' }),
    makeResult({ score: 0.3, filename: 'manual.pdf', file_id: 'f2' }),
  ],
};

// scrollIntoView is not available in JSDOM
Element.prototype.scrollIntoView = jest.fn();

describe('ChatbotFileSearchResults', () => {
  describe('toggle text', () => {
    it('should show source count without citations', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);

      expect(screen.getByTestId('file-search-results-toggle')).toHaveTextContent(
        '2 sources retrieved',
      );
    });

    it('should show singular "source" for single file', () => {
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult()],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);

      expect(screen.getByTestId('file-search-results-toggle')).toHaveTextContent(
        '1 source retrieved',
      );
    });

    it('should show cited vs retrieved counts when citationMap is provided', () => {
      const citationMap = new Map([['f1', 1]]);

      render(
        <ChatbotFileSearchResults
          fileSearchData={defaultFileSearchData}
          citationMap={citationMap}
        />,
      );

      expect(screen.getByTestId('file-search-results-toggle')).toHaveTextContent(
        '1 cited, 2 retrieved',
      );
    });
  });

  describe('expanded content', () => {
    it('should render the toggle text when collapsed', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);

      expect(screen.getByTestId('file-search-results-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('file-search-results-toggle')).toHaveTextContent(
        '2 sources retrieved',
      );
    });

    it('should show file groups and query when expanded', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);

      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.getByTestId('file-search-query')).toHaveTextContent('What is RAG?');
      expect(screen.getByTestId('file-search-group-0')).toBeInTheDocument();
      expect(screen.getByTestId('file-search-group-1')).toBeInTheDocument();
    });

    it('should not show query section when queries array is empty', () => {
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult()],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.queryByTestId('file-search-query')).not.toBeInTheDocument();
    });
  });

  describe('file groups', () => {
    it('should show filename and chunk count', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.getByTestId('file-search-group-0-chunk-count')).toHaveTextContent('2 chunks');
      expect(screen.getByTestId('file-search-group-1-chunk-count')).toHaveTextContent('1 chunk');
    });

    it('should show citation badge when citationMap has an entry', () => {
      const citationMap = new Map([['f1', 1]]);

      render(
        <ChatbotFileSearchResults
          fileSearchData={defaultFileSearchData}
          citationMap={citationMap}
        />,
      );
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.getByTestId('file-search-group-0-citation')).toHaveTextContent('[1]');
      expect(screen.queryByTestId('file-search-group-1-citation')).not.toBeInTheDocument();
    });

    it('should expand file group to show chunks when clicked', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      const contentSection = document.getElementById('file-search-group-0-content')!;
      expect(contentSection).toHaveAttribute('hidden');

      fireEvent.click(screen.getByTestId('file-search-group-0-toggle'));

      expect(contentSection).not.toHaveAttribute('hidden');
      expect(screen.getByTestId('file-search-group-0-chunk-0')).toBeInTheDocument();
      expect(screen.getByTestId('file-search-group-0-chunk-1')).toBeInTheDocument();
    });
  });

  describe('chunks', () => {
    it('should show relevance labels based on score', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));
      fireEvent.click(screen.getByTestId('file-search-group-0-toggle'));

      expect(screen.getByTestId('file-search-group-0-chunk-0-score')).toHaveTextContent(
        'High relevance',
      );
      expect(screen.getByTestId('file-search-group-0-chunk-1-score')).toHaveTextContent(
        'Medium relevance',
      );

      fireEvent.click(screen.getByTestId('file-search-group-1-toggle'));

      expect(screen.getByTestId('file-search-group-1-chunk-0-score')).toHaveTextContent(
        'Low relevance',
      );
    });

    it('should show truncated text with show more button for long snippets', () => {
      const longText = 'A'.repeat(250);
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult({ text: longText })],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));
      fireEvent.click(screen.getByTestId('file-search-group-0-toggle'));

      expect(screen.getByText('Show more')).toBeInTheDocument();
      expect(screen.getByTestId('file-search-group-0-chunk-0-text').textContent).not.toContain(
        longText,
      );

      fireEvent.click(screen.getByText('Show more'));

      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('should not show show more button for short text', () => {
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult({ text: 'Short text' })],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));
      fireEvent.click(screen.getByTestId('file-search-group-0-toggle'));

      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });
  });

  describe('citation expansion', () => {
    it('should call onCitationExpanded and set expanded state when expandedCitation is set', () => {
      const citationMap = new Map([['f1', 1]]);
      const onCitationExpanded = jest.fn();

      render(
        <ChatbotFileSearchResults
          fileSearchData={defaultFileSearchData}
          citationMap={citationMap}
          expandedCitation={1}
          onCitationExpanded={onCitationExpanded}
        />,
      );

      expect(onCitationExpanded).toHaveBeenCalled();
    });
  });

  describe('toggle behavior', () => {
    it('should toggle file group expansion on click', () => {
      render(<ChatbotFileSearchResults fileSearchData={defaultFileSearchData} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      const toggle = screen.getByTestId('file-search-group-0-toggle');
      // DataListToggle wraps a button with aria-expanded
      const toggleButton = toggle.querySelector('button') ?? toggle;

      fireEvent.click(toggle);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggle);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('grouping', () => {
    it('should fall back to file_id when filename is missing', () => {
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult({ filename: undefined, file_id: 'abc-123' })],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.getByText('abc-123')).toBeInTheDocument();
    });

    it('should fall back to "Unknown" when both filename and file_id are missing', () => {
      const data: FileSearchCallData = {
        queries: [],
        results: [makeResult({ filename: undefined, file_id: undefined })],
      };

      render(<ChatbotFileSearchResults fileSearchData={data} />);
      fireEvent.click(screen.getByTestId('file-search-results-toggle'));

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
