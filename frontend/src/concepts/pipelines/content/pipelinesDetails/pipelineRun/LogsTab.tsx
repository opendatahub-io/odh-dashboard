import React from 'react';
import { LogViewer } from '@patternfly/react-log-viewer';
import {
  Badge,
  Button,
  Tooltip,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  TextListItem,
  TextListItemVariants,
  TextContent,
  TextList,
} from '@patternfly/react-core';
import {
  Select as SelectDeprecated,
  SelectOption as SelectOptionDeprecated,
} from '@patternfly/react-core';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import OutlinedPlayCircleIcon from '@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon';
import PauseIcon from '@patternfly/react-icons/dist/esm/icons/pause-icon';
import PlayIcon from '@patternfly/react-icons/dist/esm/icons/play-icon';
import EllipsisVIcon from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';

type LogsTabProps = {
  task: PipelineRunTaskDetails;
};
const LogsTab: React.FC<LogsTabProps> = ({ task }) => {
  const dataSources = {
    'container-1': { type: 'C', id: 'data1' },
    'container-2': { type: 'D', id: 'data2' },
    'container-3': { type: 'E', id: 'data3' },
  };
  const [isPaused, setIsPaused] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [itemCount, setItemCount] = React.useState(1);
  const [currentItemCount, setCurrentItemCount] = React.useState(0);
  const [renderData, setRenderData] = React.useState('');
  const [selectedDataSource, setSelectedDataSource] = React.useState('container-1');
  const [selectDataSourceOpen, setSelectDataSourceOpen] = React.useState(false);
  const [timer, setTimer] = React.useState(500);
  const [selectedData, setSelectedData] = React
    .useState
    // data[dataSources[selectedDataSource].id].split('\n'),
    ();
  const [buffer, setBuffer] = React.useState([]);
  const [linesBehind, setLinesBehind] = React.useState(0);
  const logViewerRef = React.useRef();

  React.useEffect(() => {
    setTimer(
      window.setInterval(() => {
        setItemCount((itemCount) => itemCount + 1);
      }, 500),
    );
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  //   React.useEffect(() => {
  //     if (itemCount > selectedData.length) {
  //       window.clearInterval(timer);
  //     } else {
  //       setBuffer(selectedData.slice(0, itemCount));
  //     }
  //   }, [itemCount]);

  React.useEffect(() => {
    if (!isPaused && buffer.length > 0) {
      setCurrentItemCount(buffer.length);
      setRenderData(buffer.join('\n'));
      //   if (logViewerRef && logViewerRef.current) {
      //     logViewerRef.current.scrollToBottom();
      //   }
    } else if (buffer.length !== currentItemCount) {
      setLinesBehind(buffer.length - currentItemCount);
    } else {
      setLinesBehind(0);
    }
  }, [isPaused, buffer]);

  const onDownloadClick = () => {
    const element = document.createElement('a');
    // const dataToDownload = [data[dataSources[selectedDataSource].id]];
    // const file = new Blob(dataToDownload, { type: 'text/plain' });
    // element.href = URL.createObjectURL(file);
    element.download = `${selectedDataSource}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const onScroll = ({ scrollOffsetToBottom, _scrollDirection, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested) {
      if (scrollOffsetToBottom > 0) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }
    _scrollDirection = 'forward';
  };

  const selectDataSourceMenu = Object.entries(dataSources).map(([value, { type }]) => (
    <SelectOptionDeprecated
      key={value}
      value={value}
      isSelected={selectedDataSource === value}
      isChecked={selectedDataSource === value}
    >
      <Badge key={value}>{type}</Badge>
      {` ${value}`}
    </SelectOptionDeprecated>
  ));

  const selectDataSourcePlaceholder = (
    <React.Fragment>
      <Badge>{dataSources[selectedDataSource].type}</Badge>
      {` ${selectedDataSource}`}
    </React.Fragment>
  );

  const ControlButton = () => (
    <Button
      variant={isPaused ? 'plain' : 'link'}
      onClick={() => {
        setIsPaused(!isPaused);
      }}
    >
      {isPaused ? <PlayIcon /> : <PauseIcon />}
      {isPaused ? ` Resume refreshing` : ` Pause refreshing`}
    </Button>
  );

  const leftAlignedToolbarGroup = (
    <React.Fragment>
      <ToolbarToggleGroup toggleIcon={<EllipsisVIcon />} breakpoint="md">
        <ToolbarItem>
          <TextContent>
            <TextListItem component={TextListItemVariants.dt}>Container</TextListItem>
          </TextContent>
        </ToolbarItem>
        <ToolbarItem variant="search-filter">
          <SelectDeprecated
            onToggle={(_event, isOpen) => setSelectDataSourceOpen(_event)}
            onSelect={(event, selection) => {
              setSelectDataSourceOpen(false);
              //   setSelectedDataSource(selection);
              //   setSelectedData(data[dataSources[selection].id].split('\n'));
              setLinesBehind(0);
              setBuffer([]);
              setItemCount(1);
              setCurrentItemCount(0);
            }}
            selections={selectedDataSource}
            isOpen={selectDataSourceOpen}
            placeholderText={selectDataSourcePlaceholder}
          >
            {selectDataSourceMenu}
          </SelectDeprecated>
        </ToolbarItem>
      </ToolbarToggleGroup>
      <ToolbarItem>
        <ControlButton />
      </ToolbarItem>
    </React.Fragment>
  );

  const rightAlignedToolbarGroup = (
    <React.Fragment>
      <ToolbarGroup variant="icon-button-group">
        <ToolbarItem>
          <Tooltip position="top" content={<div>Download</div>}>
            <Button onClick={onDownloadClick} variant="plain" aria-label="Download current logs">
              Download
            </Button>
          </Tooltip>
        </ToolbarItem>
      </ToolbarGroup>
    </React.Fragment>
  );

  const FooterButton = () => {
    const handleClick = (_e) => {
      setIsPaused(false);
    };
    return (
      <Button onClick={handleClick} isBlock>
        <OutlinedPlayCircleIcon />
        resume {linesBehind === 0 ? null : `and show ${linesBehind} lines`}
      </Button>
    );
  };
  return (
    <>
      <Alert
        isExpandable
        isInline
        variant="warning"
        title="The log window displays partial content"
      >
        <p>
          The log refreshes every 3 seconds and displays the latest 500 lines. Exceptionally long
          lines are abridged. To view the full log for this task, you can download all container
          logs associated with it.
        </p>
      </Alert>
      <LogViewer
        data={'data'}
        //   id="log-tabs-toolbar"
        scrollToRow={currentItemCount}
        innerRef={logViewerRef}
        height={isFullScreen ? '100%' : 600}
        width={isFullScreen ? '100%' : 500}
        toolbar={
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup alignment={{ default: 'alignLeft' }}>
                {leftAlignedToolbarGroup}
              </ToolbarGroup>
              <ToolbarGroup alignment={{ default: 'alignRight' }}>
                {rightAlignedToolbarGroup}
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
        }
        overScanCount={10}
        footer={isPaused && <FooterButton />}
        //   onScroll={onScroll}
      />
    </>
  );
};

export default LogsTab;
