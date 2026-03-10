# FileExplorer

* **FileExplorer Status**: Review
* **S3FileExplorer Status**: Pending
* **S3 BFF Status**: Pending

A reusable file explorer widget in RHOAI that enables user interaction with files found in a given source.

## Purpose

For multiple experiences in the RHOAI dashboard (AutoRAG and AutoML), users will need to explicitly pick out a file found within an S3 bucket.
Typically, this will be in wizard-like experiences that require a file to be provided for their initial set-ups.

## UX

The FileExplorer will open as a reusable modal.
It will primarily render a table of files and directories. 
A details panel will show info to the user including any files selected and their metadata.
Breadcrumbs, search and pagination will help the user navigate the source of files.
Two CTAs render at the bottom: **Select files** and **Cancel**, allowing the user to continue in the wizard with their chosen file(s).

Since both Files and Directories are rendered in the table, selection (multi/singular) can apply to both.

## UI

The UI implementation will follow our upstream/midstream strategy in RHOAI.

The FileExplorer widget is available as a React component built with PatternFly.
The intention is for the widget to be available as a federated module that can be leveraged in any area of RHOAI.

The FileExplorer is a pure-UI controlled component that will manage/help-manage the interactions with all underlying PF components.
It will provide a straightforward contract of state and behaviour based props that consumers can integrate with simply.
TypeScript definitions of the nouns used throughout (Source/File/Directory) will be provided.

FileExplorer in the future will/should live in PatternFly as a component-group.

For the S3-specific implementation we will implement an S3FileExplorer component. This component will render a FileExplorer component and manage the state/behaviour connected to the S3 golang BFF.

## API

In the initial phase, the S3FileExplorer widget uses the common S3 BFF API primarily for listing connections and files in a bucket/connection.

## Tasks

**Alpha**:
- [X] Implement basic rendering of the component within this AutoRAG module
- [ ] Implement a basic BFF integration (w/ mocks) for the S3 BFF
- [ ] Once rendering is done + BFF is done: Integrate together

**Acceptance criteria**:
- [ ] _Integration_: FileExplorer should be painless to integrate into a new UI.
- [ ] _Flexibility_: FileExplorer's UI (labels, areas rendered, table sizing...etc.) should be configurable via props.
- [X] _Portability_: Since we know we need to move it out of the AutoRAG module eventually into a common area, it should be built with that in mind.
- [X] _Usability_: The table of files should allow selection: radio (singular) or checkbox (multiple).
  - [ ] Batch selection should have a configurable limit. AutoRAG may need to only allow selecting 2 files. 
- [X] _Usability_: When a user interacts with a 'folder' row, it should allow drilling into the folder to see its subcontents. Doing so will render breadcrumbs.
- [X] _Clarity_: We should show as much information about the sources and files that we can to make selection clear:
  - [ ] Sources/Files should render with ellipses and `title` attributes to handle long file names
  - [ ] Files table should render columns: Name / Type (File's type or 'Folder') / Items
  - [ ] The table should gracefully handle pagination necessary for sources with many files
  - [ ] S3FileExplorer should provide as much data on a file as possible to be rendered in the details panel
- [ ] _Usability_: The component API for providing sources, those sources providing files, and files being clickable/renderable should be easy to consume and robust

**For MVP: AutoRAG & AutoML**:
- [ ] _Portability_: Move implementation of UI component (FileExplorer and into [mod-arch-library/mod-arch-shared](https://github.com/opendatahub-io/mod-arch-library/tree/main/mod-arch-shared/components).
- [ ] _Instrumentation_: Instrument all major interactions to observe how it may evolve based on use

**Post MVP**:
- [ ] _Portability_: Move implementation of UI component into [patternfly/react-component-groups](https://github.com/patternfly/react-component-groups).
- [ ] _Portability_: Move BFF implementation into common UI/BFF module for reuse between AutoRAG and AutoML.
