import * as React from 'react';
import {
  Content,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import { FileSearchCallData, FileSearchResult } from '~/app/types';
import './ChatbotFileSearchResults.scss';

type ChatbotFileSearchResultsProps = {
  fileSearchData: FileSearchCallData;
};

type FileGroup = {
  filename: string;
  chunks: FileSearchResult[];
  bestScore: number;
};

const MAX_SNIPPET_LENGTH = 200;

const truncateText = (
  text: string,
  maxLength: number,
): { truncated: string; isTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }
  return { truncated: `${text.slice(0, maxLength)}...`, isTruncated: true };
};

const getScoreColor = (score: number): string => {
  if (score >= 0.8) {
    return 'var(--pf-t--global--color--status--success--default)';
  }
  if (score >= 0.5) {
    return 'var(--pf-t--global--color--status--warning--default)';
  }
  return 'var(--pf-t--global--color--status--danger--default)';
};

const formatScore = (score: number): string => score.toFixed(2);

const groupResultsByFile = (results: FileSearchResult[]): FileGroup[] => {
  const groups = new Map<string, FileSearchResult[]>();

  for (const result of results) {
    const filename = result.filename ?? result.file_id ?? 'Unknown';
    const existing = groups.get(filename);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(filename, [result]);
    }
  }

  return Array.from(groups.entries()).map(([filename, chunks]) => ({
    filename,
    chunks,
    bestScore: Math.max(...chunks.map((c) => c.score)),
  }));
};

type ChunkRowProps = {
  chunk: FileSearchResult;
  index: number;
  groupIndex: number;
};

const ChunkRow: React.FC<ChunkRowProps> = ({ chunk, index, groupIndex }) => {
  const [isShowingMore, setIsShowingMore] = React.useState(false);
  const { truncated, isTruncated } = truncateText(chunk.text || '', MAX_SNIPPET_LENGTH);

  return (
    <div
      className="chatbot-file-search__chunk"
      data-testid={`file-search-group-${groupIndex}-chunk-${index}`}
    >
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>
          <Content component="small" className="chatbot-file-search__chunk-label">
            Chunk {index + 1}
          </Content>
        </FlexItem>
        <FlexItem>
          <span
            className="chatbot-file-search__score"
            style={{ color: getScoreColor(chunk.score) }}
            data-testid={`file-search-group-${groupIndex}-chunk-${index}-score`}
          >
            {formatScore(chunk.score)}
          </span>
        </FlexItem>
      </Flex>
      {chunk.text && (
        <Content
          component="p"
          className="chatbot-file-search__snippet"
          data-testid={`file-search-group-${groupIndex}-chunk-${index}-text`}
        >
          &ldquo;{isShowingMore ? chunk.text : truncated}&rdquo;
          {isTruncated && (
            <>
              {' '}
              <button
                type="button"
                className="chatbot-file-search__show-more"
                onClick={() => setIsShowingMore((prev) => !prev)}
              >
                {isShowingMore ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </Content>
      )}
    </div>
  );
};

type FileGroupRowProps = {
  group: FileGroup;
  index: number;
};

const FileGroupRow: React.FC<FileGroupRowProps> = ({ group, index }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const ToggleIcon = isExpanded ? AngleDownIcon : AngleRightIcon;
  const chunkCount = group.chunks.length;

  return (
    <div className="chatbot-file-search__file-group" data-testid={`file-search-group-${index}`}>
      <button
        type="button"
        className="chatbot-file-search__row-toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        data-testid={`file-search-group-${index}-toggle`}
      >
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <ToggleIcon className="chatbot-file-search__row-toggle-icon" />
            <span className="chatbot-file-search__filename">{group.filename}</span>
          </FlexItem>
          <FlexItem>
            <span
              className="chatbot-file-search__chunk-count"
              style={{ color: getScoreColor(group.bestScore) }}
              data-testid={`file-search-group-${index}-chunk-count`}
            >
              {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
            </span>
          </FlexItem>
        </Flex>
      </button>
      {isExpanded && (
        <div className="chatbot-file-search__chunks">
          {group.chunks.map((chunk, chunkIndex) => (
            <ChunkRow
              key={chunk.file_id ?? chunkIndex}
              chunk={chunk}
              index={chunkIndex}
              groupIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ChatbotFileSearchResults: React.FC<ChatbotFileSearchResultsProps> = ({ fileSearchData }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleId = React.useId();
  const contentId = React.useId();

  const { queries, results } = fileSearchData;

  const fileGroups = React.useMemo(() => groupResultsByFile(results), [results]);

  const totalSources = fileGroups.length;
  const totalChunks = results.length;

  return (
    <div className="chatbot-file-search" data-testid="file-search-results">
      <ExpandableSectionToggle
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((prev) => !prev)}
        contentId={contentId}
        toggleId={toggleId}
        data-testid="file-search-results-toggle"
      >
        {totalSources} source{totalSources !== 1 ? 's' : ''}, {totalChunks} chunk
        {totalChunks !== 1 ? 's' : ''} retrieved
      </ExpandableSectionToggle>
      <ExpandableSection
        isExpanded={isExpanded}
        isDetached
        contentId={contentId}
        toggleId={toggleId}
      >
        <div className="chatbot-file-search__content">
          {queries.length > 0 && (
            <Content
              component="small"
              className="chatbot-file-search__query"
              data-testid="file-search-query"
            >
              <span className="chatbot-file-search__query-label">Embedding query:</span> &ldquo;
              {queries[0]}&rdquo;
            </Content>
          )}
          <div className="chatbot-file-search__table">
            {fileGroups.map((group, index) => (
              <FileGroupRow key={group.filename} group={group} index={index} />
            ))}
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
};

export default ChatbotFileSearchResults;
