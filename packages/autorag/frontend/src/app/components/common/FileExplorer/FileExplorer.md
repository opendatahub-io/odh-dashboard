# FileExplorer

* **FileExplorer Status**: Review
* **S3FileExplorer Status**: Review
* **S3 BFF Status**: Delivered

A reusable file explorer widget in RHOAI that enables user interaction with files found in a given source.

## Purpose

For multiple experiences in the RHOAI dashboard (AutoRAG and AutoML), users will need to explicitly pick out a file found within an S3 bucket.
Typically, this will be in wizard-like experiences that require a file to be provided for their initial set-ups.

## UX

The FileExplorer will open as a reusable modal.
It will primarily render a table of files and folders. 
A details panel will show info to the user including any files selected and their metadata.
Breadcrumbs, search and pagination will help the user navigate the source of files.
Two CTAs render at the bottom: **Select files** and **Cancel**, allowing the user to continue in the wizard with their chosen file(s).

Since both Files and Folders are rendered in the table, selection (multi/singular) can apply to both.

## UI

The UI implementation will follow our upstream/midstream strategy in RHOAI.

The FileExplorer widget is available as a React component built with PatternFly.
The intention is for the widget to be available as a federated module that can be leveraged in any area of RHOAI.

The FileExplorer is implemented as a highly controlled UI component (some internal state is tracked) that will manage/help-manage the interactions with all underlying PF components.
It will provide a straightforward contract of state and behaviour based props that consumers can integrate with simply.
TypeScript definitions of the nouns used throughout (Source/File/Folder) will be provided.

FileExplorer in the future will/should live in PatternFly as a component-group.

For the S3-specific implementation we will implement an S3FileExplorer component. This component will render a FileExplorer component and manage the state/behaviour connected to the S3 golang BFF.

## API

In the initial phase, the S3FileExplorer widget uses the common S3 BFF API primarily for listing connections and files in a bucket/connection.

## Documentation

This doc outlines some high-level requirements for the FileExplorer and any remaining tasks we want to cover in the coming releases.
For the initial MVP since we may need to duplicate the FileExplorer/S3FileExplore code in _both_ autorag and automl, we will keep autorag as the source of truth.
Changes will be mirrored to ensure both rag/ml remain in sync.

## Tasks

- [ ] FileExplorer: Handle scroll in details panel when multiple files are selected
- [ ] Testing: Full JEST test suite
- [ ] FileExplorer.playground: Wire the selected source back into FileExplorer: This callback only updates the debug card. The modal keeps receiving source={undefined}, so the chosen source never shows up in breadcrumbs/details and the source selector never exits the "unselected" state (add setSourceToRender(source) alongside setSelectedSource(source) in the onSelectSource handler so the chosen source is actually fed back into the FileExplorer props)
- [ ] FileExplorer: Fall back to the rendered row count when itemCount is omitted: With the current default, the pager shows 0 items even when the table has rows. Using files?.length ?? 0 as the fallback keeps the footer consistent for non-paginated callers.

### Delivery

**Alpha**:
- [X] Implement basic rendering of the component within this AutoRAG module
- [X] Implement a basic BFF integration (w/ mocks) for the S3 BFF
- [X] Once rendering is done + BFF is done: Integrate together

**Acceptance criteria**:
- [ ] _Integration_: FileExplorer should be painless to integrate into a new UI.
- [X] _Flexibility_: FileExplorer's UI (labels, areas rendered, table sizing...etc.) should be configurable via props.
- [X] _Portability_: Since we know we need to move it out of the AutoRAG module eventually into a common area, it should be built with that in mind.
- [X] _Usability_: The table of files should allow selection: radio (singular) or checkbox (multiple).
  - [ ] Batch selection should have a configurable limit. AutoRAG may need to only allow selecting 2 files. 
- [X] _Usability_: When a user interacts with a 'folder' row, it should allow drilling into the folder to see its subcontents. Doing so will render breadcrumbs.
- [X] _Clarity_: We should show as much information about the sources and files that we can to make selection clear:
  - [X] Sources/Files should render with ellipses and `title` attributes to handle long file names
  - [X] Files table should render columns: Name / Type (File's type or 'Folder')
  - [X] The table should gracefully handle pagination necessary for sources with many files
  - [X] S3FileExplorer should provide as much data on a file as possible to be rendered in the details panel
- [ ] _Usability_: The component API for providing sources, those sources providing files, and files being clickable/renderable should be easy to consume and robust

**For MVP: AutoRAG & AutoML**:
- [ ] _Portability_: Move implementation of UI component. FileExplorer into [mod-arch-library/mod-arch-shared](https://github.com/opendatahub-io/mod-arch-library/tree/main/mod-arch-shared/components).
- [ ] _Instrumentation_: Instrument all major interactions to observe how it may evolve based on use

**Post MVP**:
- [ ] _Portability_: Move implementation of UI component into [patternfly/react-component-groups](https://github.com/patternfly/react-component-groups).
- [ ] _Portability_: Move BFF implementation into common UI/BFF module for reuse between AutoRAG and AutoML.
