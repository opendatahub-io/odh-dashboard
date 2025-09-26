import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { PlayIcon, FilterIcon, SyncAltIcon } from '@patternfly/react-icons';
import DashboardSearchField, {
  SearchType,
} from 'mod-arch-shared/dist/components/DashboardSearchField';
import { PLAYGROUND_URL_PREFIX } from '~/app/utilities/const';

interface MCPServersToolbarProps {
  filterValue: string;
  onFilterChange: (value: string) => void;
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
  selectedCount: number;
  selectedServerIds: string[];
  onTryInPlayground: (serverIds: string[]) => void;
  onRefresh?: () => void;
}

const MCPServersToolbar: React.FC<MCPServersToolbarProps> = ({
  filterValue,
  onFilterChange,
  searchType,
  onSearchTypeChange,
  selectedCount,
  selectedServerIds,
  onTryInPlayground,
  onRefresh,
}) => {
  const navigate = useNavigate();

  const handleTryInPlayground = React.useCallback(() => {
    // Save selections to playground and navigate
    onTryInPlayground(selectedServerIds);
    navigate(PLAYGROUND_URL_PREFIX);
  }, [selectedServerIds, onTryInPlayground, navigate]);

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem style={{ minWidth: '300px' }}>
          <DashboardSearchField
            types={[SearchType.NAME, SearchType.KEYWORD, SearchType.DESCRIPTION]}
            searchType={searchType}
            onSearchTypeChange={onSearchTypeChange}
            searchValue={filterValue}
            onSearchValueChange={onFilterChange}
            icon={<FilterIcon />}
          />
        </ToolbarItem>
        <ToolbarItem>
          <Button
            variant="primary"
            icon={<PlayIcon />}
            onClick={handleTryInPlayground}
            isDisabled={selectedCount === 0}
          >
            Try in Playground{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </ToolbarItem>
        {onRefresh && (
          <ToolbarItem>
            <Button
              variant="link"
              icon={<SyncAltIcon />}
              onClick={onRefresh}
              aria-label="Refresh MCP servers and connection status"
            >
              Refresh
            </Button>
          </ToolbarItem>
        )}
      </ToolbarContent>
    </Toolbar>
  );
};

export default MCPServersToolbar;
