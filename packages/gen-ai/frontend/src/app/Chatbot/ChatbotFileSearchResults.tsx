import * as React from 'react';
import {
  Content,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import { FileSearchCallData, FileSearchResult } from '~/app/types';
import './ChatbotFileSearchResults.scss';

type ChatbotFileSearchResultsProps = {
  fileSearchData: FileSearchCallData;
};

const MAX_SNIPPET_LENGTH = 400;

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
};

const getScoreColor = (score: number): 'green' | 'orange' | 'grey' => {
  if (score >= 0.8) {
    return 'green';
  }
  if (score >= 0.5) {
    return 'orange';
  }
  return 'grey';
};

const formatScore = (score: number): string => score.toFixed(2);

type FileSearchResultRowProps = {
  result: FileSearchResult;
  index: number;
};

const FileSearchResultRow: React.FC<FileSearchResultRowProps> = ({ result, index }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const filename = result.filename ?? result.file_id ?? 'Unknown';
  const ToggleIcon = isExpanded ? AngleDownIcon : AngleRightIcon;

  return (
    <div className="chatbot-file-search__row" data-testid={`file-search-result-${index}`}>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>
          <button
            type="button"
            className="chatbot-file-search__row-toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            data-testid={`file-search-result-${index}-toggle`}
          >
            <ToggleIcon className="chatbot-file-search__row-toggle-icon" />
            <span className="chatbot-file-search__filename">{filename}</span>
          </button>
        </FlexItem>
        <FlexItem>
          <Label
            variant="outline"
            isCompact
            color={getScoreColor(result.score)}
            data-testid={`file-search-result-${index}-score`}
          >
            {formatScore(result.score)}
          </Label>
        </FlexItem>
      </Flex>
      {isExpanded && result.text && (
        <Content
          component="p"
          className="chatbot-file-search__snippet"
          data-testid={`file-search-result-${index}-text`}
        >
          {truncateText(result.text, MAX_SNIPPET_LENGTH)}
        </Content>
      )}
    </div>
  );
};

const ChatbotFileSearchResults: React.FC<ChatbotFileSearchResultsProps> = ({ fileSearchData }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleId = React.useId();
  const contentId = React.useId();

  const { queries, results } = fileSearchData;
  const resultCount = results.length;

  return (
    <div className="chatbot-file-search" data-testid="file-search-results">
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
        <FlexItem>
          <ExpandableSectionToggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((prev) => !prev)}
            contentId={contentId}
            toggleId={toggleId}
            data-testid="file-search-results-toggle"
          >
            {resultCount} source{resultCount !== 1 ? 's' : ''} retrieved
          </ExpandableSectionToggle>
        </FlexItem>
        {queries.length > 0 && (
          <FlexItem>
            <Label variant="outline" isCompact data-testid="file-search-query">
              Query: {queries[0]}
            </Label>
          </FlexItem>
        )}
      </Flex>
      <ExpandableSection
        isExpanded={isExpanded}
        isDetached
        contentId={contentId}
        toggleId={toggleId}
      >
        <div className="chatbot-file-search__table">
          <Flex
            className="chatbot-file-search__header"
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Content component="small">DOCUMENT</Content>
            </FlexItem>
            <FlexItem>
              <Content component="small">RELEVANCE</Content>
            </FlexItem>
          </Flex>
          {results.map((result, index) => (
            <FileSearchResultRow
              key={result.file_id ?? result.filename ?? index}
              result={result}
              index={index}
            />
          ))}
        </div>
      </ExpandableSection>
    </div>
  );
};

export default ChatbotFileSearchResults;
