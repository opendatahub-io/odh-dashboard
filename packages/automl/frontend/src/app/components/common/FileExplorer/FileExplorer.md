# FileExplorer

- `status: In progress`

A reusable file explorer widget in RHOAI that enables user interaction with files found in a given source.

## Purpose

For multiple experiences in the RHOAI dashboard (AutoRAG and AutoML), users will need to explicitly pick out a file found within an S3 bucket.
Typically, this will be in wizard-like experiences that require a file to be provided for their initial set-ups.

## UX

The FileExplorer will open as a reusable modal.
The modal has a left section allowing the user to select the source of the files (S3 connections), and a right section which renders the list of files in a table found in the source (S3 objects).

Two CTAs will render at the bottom: Select files, Cancel. Allowing the user to continue onto the wizard experience with their chosen file(s).

## UI

The FileExplorer widget is available as a React component built with PatternFly.
The intention is for the widget to be available as a federated module that can be leveraged in any area of RHOAI.

## API

The FileExplorer widget in the initial phase will make use primarily of a common S3 BFF API for listing connections and listing the files in a bucket/connection.

## Tasks

**Alpha**:
- [ ] Implement a basic rendering of the component completed in this autorag module
- [ ] Implement a basic BFF integration (w/ mocks) for the S3 BFF
- [ ] Once rendering is done + BFF is done: Integrate together

**Acceptance criteria**:
- [ ] _Integration_: FileExplorer should be painless to integrate into a new UI.
- [ ] _Flexibility_: FileExplorer's UI (labels, areas rendered, table sizing...etc.) should be configurable via props.
- [ ] _Portability_: Since we know we need to move it out of the AutoRAG module eventually into a common area, it should be built with that in mind.
- [ ] _Usability_: The table of files should at least allow radio selection (singular).
- [ ] _Usability_: When a user interacts with a 'folder' file, it should allow drilling into the folder to see it's subcontents. Doing so will render breadcrumbs (Needs design input)
- [ ] _Clarity_: We should show as much information about the sources and files that we can to make selection clear:
  - [ ] Sources/Files should render with ellipses and `title` attributes to handle long file names
  - [ ] Files table should render columns: Name / Type (File or Folder) / Size 
  - [ ] The table should gracefully handle pagination necessary for sources with many files
- [ ] _Usability_: The component API for providing sources, those sources providing files, and files being clickable/renderable should be easy to consume and robust

**Future**:
- [ ] _Portability_: Move implementation of UI component into [patternfly/react-component-groups](https://github.com/patternfly/react-component-groups).
- [ ] _Portability_: Move BFF implementation into common UI/BFF module for reuse between AutoRAG and AutoML.
- [ ] _Usability_: The table of files should allow checkbox selection (multiple).
