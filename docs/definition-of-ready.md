# Definition of Ready
When the elements defined in the Definition of Ready are complete, the product team can begin its implementation of the deliverables identified

## Requirements clear

1. Jira exists and all requirements have been refined and written as a user story (i.e. “As an <user> I want <feature> so that <solves the problem>”) for example in a living Google document attached to the JIRA until fully refined and moved back into JIRA.  The stories should be assigned points before work can begin.
2. Teams that will work on the JIRA are identified - the teams will create the child JIRAs to capture the work based on the requirements
3. Acceptance criteria, incl. a description of acceptance tests, exist and are understood by the team
4. Dependencies have been identified so that they would not block the JIRA from being completed - dependencies will be tracked in linked JIRAs
5. All stakeholders (PM, BU, Eng/QE, CCS, UX) reviewed the requirement and there are no outstanding questions
6. Any new feature has been reviewed and approved by the Dashboard Architect.
7. An owner is identified and is responsible for communicating the status to all stakeholders
8. All stakeholders provided time and resource estimates for the work/task that needs to be done - Eng, Docs, QE, UX, feature owners are identified
9. Changes to requirements during the design, development, and testing phases must be promptly communicated and justified to impacted stakeholders who must promptly review
10. UX designs have been reviewed and signed off by stakeholders with no major changes to be expected. These designs need to be in a state where the work can be scoped by the dashboard team, though not necessarily complete. Small details can be worked on as we start allowing the team to discover minor implementation details about the flow during development.
11. API (REST and CRD) requirements for the feature should be clearly documented and reviewed with one of the advisors on the Dashboard team.
12. Feature implementation document including API requirements and any high level implementation points that are critical should be created and reviewed by an advisor on the Dashboard team.
13. Dependencies and backend component APIs should be fully ready (including v2 Operator support built-in).  These features could be enabled via DevFlags if needed but should not be installed via scripts or yaml files provided by the backend team.  
14. The backend team should provide a demo of how to use the resources for the feature and provide sample data to use for the feature development.

## Non-functional requirements clear

1. Security, Performance, Disconnected, Interoperability, and Usability expectations are reviewed and any impacts that teams must consider during development and testing are captured.

## Infrastructure defined

1. A CI (Continuous Delivery) platform to deliver nightly builds with the new features/bug fixes is defined
2. Environment for cross-product/layered-product/interoperability testing is identified and prepared (e.g. Integreatly, or hardware)

More details at:  [What is the Definition of Ready?](https://www.agilealliance.org/glossary/definition-of-ready/)