import * as React from 'react';
import {
  Button,
  Content,
  DataList,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { FileSearchCallData, FileSearchResult } from '~/app/types';
import './ChatbotFileSearchResults.scss';

type ChatbotFileSearchResultsProps = {
  fileSearchData: FileSearchCallData;
  citationMap?: Map<string, number>;
  expandedCitation?: number;
  onCitationExpanded?: () => void;
};

type FileGroup = {
  filename: string;
  chunks: FileSearchResult[];
  bestScore: number;
  citationNumber?: number;
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

type RelevanceTier = {
  label: string;
  color: 'green' | 'orange' | 'red';
};

const getRelevanceTier = (score: number): RelevanceTier => {
  if (score >= 0.8) {
    return { label: 'High relevance', color: 'green' };
  }
  if (score >= 0.5) {
    return { label: 'Medium relevance', color: 'orange' };
  }
  return { label: 'Low relevance', color: 'red' };
};

const getChunkCountColor = (score: number): string | undefined => {
  if (score >= 0.8) {
    return 'var(--pf-t--color--green--50)';
  }
  if (score >= 0.5) {
    return 'var(--pf-t--color--orange--50)';
  }
  return 'var(--pf-t--color--red--50)';
};

const formatScore = (score: number): string => score.toFixed(2);

const groupResultsByFile = (
  results: FileSearchResult[],
  citationMap?: Map<string, number>,
): FileGroup[] => {
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

  return Array.from(groups.entries()).map(([filename, chunks]) => {
    const fileId = chunks[0]?.file_id;
    return {
      filename,
      chunks,
      bestScore: Math.max(...chunks.map((c) => c.score)),
      citationNumber: fileId ? citationMap?.get(fileId) : citationMap?.get(filename),
    };
  });
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
          <Content component="small" className="pf-v6-u-font-weight-bold">
            Chunk {index + 1}
          </Content>
        </FlexItem>
        <FlexItem>
          <Label
            color={getRelevanceTier(chunk.score).color}
            isCompact
            data-testid={`file-search-group-${groupIndex}-chunk-${index}-score`}
          >
            {getRelevanceTier(chunk.score).label} &mdash; {formatScore(chunk.score)}
          </Label>
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
            <Button
              variant="link"
              isInline
              className="pf-v6-u-font-size-xs pf-v6-u-display-block pf-v6-u-mt-xs"
              onClick={() => setIsShowingMore((prev) => !prev)}
            >
              {isShowingMore ? 'Show less' : 'Show more'}
            </Button>
          )}
        </Content>
      )}
    </div>
  );
};

type FileGroupRowProps = {
  group: FileGroup;
  index: number;
  isForceExpanded?: boolean;
  isHighlighted?: boolean;
  collapseKey: number;
};

const FileGroupRow: React.FC<FileGroupRowProps> = ({
  group,
  index,
  isForceExpanded,
  isHighlighted,
  collapseKey,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const expanded = isForceExpanded || isExpanded;
  const chunkCount = group.chunks.length;
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isForceExpanded) {
      setIsExpanded(true);
      groupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isForceExpanded]);

  React.useEffect(() => {
    setIsExpanded(false);
  }, [collapseKey]);

  return (
    <div ref={groupRef}>
      <DataListItem
        aria-labelledby={`file-search-group-${index}-name`}
        isExpanded={expanded}
        data-testid={`file-search-group-${index}`}
        className={isHighlighted ? 'chatbot-file-search__file-group--highlighted' : undefined}
      >
        <DataListItemRow>
          <DataListToggle
            onClick={() => setIsExpanded((prev) => !prev)}
            isExpanded={expanded}
            id={`file-search-group-${index}-toggle`}
            aria-controls={`file-search-group-${index}-content`}
            data-testid={`file-search-group-${index}-toggle`}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key="name">
                <span
                  id={`file-search-group-${index}-name`}
                  className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm"
                >
                  {group.filename}
                </span>
                {group.citationNumber != null && (
                  <span
                    className="chatbot-file-search__citation-badge"
                    data-testid={`file-search-group-${index}-citation`}
                  >
                    [{group.citationNumber}]
                  </span>
                )}
              </DataListCell>,
              <DataListCell key="count" alignRight isFilled={false}>
                <span
                  className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm"
                  style={{ color: getChunkCountColor(group.bestScore) }}
                  data-testid={`file-search-group-${index}-chunk-count`}
                >
                  {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
                </span>
              </DataListCell>,
            ]}
          />
        </DataListItemRow>
        <DataListContent
          aria-label={`${group.filename} chunks`}
          id={`file-search-group-${index}-content`}
          isHidden={!expanded}
        >
          <div className="chatbot-file-search__chunks">
            {group.chunks.map((chunk, chunkIndex) => (
              <ChunkRow
                key={`${chunk.file_id ?? 'chunk'}-${chunkIndex}`}
                chunk={chunk}
                index={chunkIndex}
                groupIndex={index}
              />
            ))}
          </div>
        </DataListContent>
      </DataListItem>
    </div>
  );
};

const ChatbotFileSearchResults: React.FC<ChatbotFileSearchResultsProps> = ({
  fileSearchData,
  citationMap,
  expandedCitation,
  onCitationExpanded,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [collapseKey, setCollapseKey] = React.useState(0);
  const [highlightedCitation, setHighlightedCitation] = React.useState<number | undefined>();
  const toggleId = React.useId();
  const contentId = React.useId();

  const { queries, results } = fileSearchData;

  const fileGroups = React.useMemo(
    () => groupResultsByFile(results, citationMap),
    [results, citationMap],
  );

  const totalSources = fileGroups.length;
  const citedSources = citationMap ? fileGroups.filter((g) => g.citationNumber != null).length : 0;

  React.useEffect(() => {
    if (expandedCitation != null) {
      setIsExpanded(true);
      setHighlightedCitation(expandedCitation);
      onCitationExpanded?.();
      const timer = window.setTimeout(() => setHighlightedCitation(undefined), 2100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [expandedCitation, onCitationExpanded]);

  return (
    <div className="chatbot-file-search" data-testid="file-search-results">
      <ExpandableSectionToggle
        isExpanded={isExpanded}
        onToggle={() => {
          setIsExpanded((prev) => {
            if (prev) {
              setCollapseKey((k) => k + 1);
            }
            return !prev;
          });
        }}
        contentId={contentId}
        toggleId={toggleId}
        data-testid="file-search-results-toggle"
      >
        {citedSources > 0
          ? `${citedSources} cited, ${totalSources} retrieved`
          : `${totalSources} source${totalSources !== 1 ? 's' : ''} retrieved`}
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
              <span className="pf-v6-u-font-weight-bold">Embedding query:</span> &ldquo;
              {queries[0]}&rdquo;
            </Content>
          )}
          <DataList aria-label="File search results" isCompact>
            {fileGroups.map((group, index) => (
              <FileGroupRow
                key={group.filename}
                group={group}
                index={index}
                collapseKey={collapseKey}
                isForceExpanded={
                  expandedCitation != null && group.citationNumber === expandedCitation
                }
                isHighlighted={
                  highlightedCitation != null && group.citationNumber === highlightedCitation
                }
              />
            ))}
          </DataList>
        </div>
      </ExpandableSection>
    </div>
  );
};

export default ChatbotFileSearchResults;
