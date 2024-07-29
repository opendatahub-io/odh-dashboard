# Definition of Done
When the elements in the Definition of Done are complete, the feature, bug or story being developed will be considered ready for release.

## Code completion
- The code has been reviewed by an advisor and another member of the dashboard team, ran it locally and approved it.
- Any new Dashboard Pod Endpoints has an architectural review -- thus avoiding security holes introduced in the backend.
- Reviewer will identify any code that might behave differently upstream and downstream and ensure developer has adequately tested these scenarios.
- Any code change has appropriate automated tests (cypress, unit) before the code can be merged.
- UI visual changes match designs proposed by UX.

## Testing and verification
- For feature work - a demo has been created and recorded (and linked to in the relevant Jira issue).  For bugs - screenshots should be added to the pull request and linked to from Jira for reference.
- All changes (fixes, new features...) have been tested at least manually (ideally automated) using a built image.  This can be a nightly ODH image or an RC build.
- Information about how the changes were tested should be added to the relevant Jira issue (epic, bug or story with no epic parent).
- All code has been merged to the downstream branch and automated quality gates have successfully passed.

## Jira status
- Screenshots of the updated UI should be captured in the Jira history/comments (or link to GitHub Pull Request with these screenshots) to illustrate work that was completed.
- All related UX stories are closed.
- Any blocking, dependent or child issues are all closed in Jira.
- Epic has fix version set, any bugs or stories that do not have an Epic parent have the fix version set.
- Any follow-up issues that were identified during testing or review but do not block the release have been created in Jira and linked to the original issue.
- Any issues needing release notes are identified and information provided to the docs team.

## Stakeholder acceptance/review
- A link to a working cluster with the code is provided for UXD, PM and Docs to try out the feature.
- Link to the demo created above is also made available to stakeholders to assist during the acceptance process.
- UI visual changes have been reviewed and/or tested by UX.
- UI microcopy has been reviewed.
- Any new feature must conform to the Dashboard Architect's approval.
- PM has reviewed and signed off on the functionality.

Once all of the above bullets are completed - the epic, story or bug that is being considered will be ready for release.

More details at:  [What is the Definition of Done?](https://www.agilealliance.org/glossary/definition-of-done/)


