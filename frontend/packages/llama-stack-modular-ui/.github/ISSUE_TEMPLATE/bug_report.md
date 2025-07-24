name: Bug Report
description: File a bug report.
title: "[Bug]: "
labels: ["kind/bug", "priority/normal", "untriaged"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report! Please, fill this form to help us improve the project.
  - type: checkboxes
    attributes:
      label: Is there an existing issue for this?
      description: Please search to see if an issue already exists for the bug you encountered.
      options:
        - label: I have searched the existing issues
          required: true
  - type: input
    id: version
    attributes:
      label: Version
      description: |
        What was the version this was found on?

        eg. a branch name, a commit id, or a version number
    validations:
      required: true
  - type: textarea
    attributes:
      label: Current Behavior
      description: A concise description of what you're experiencing.
    validations:
      required: true
  - type: textarea
    attributes:
      label: Expected Behavior
      description: A concise description of what you expected to happen.
    validations:
      required: true
  - type: textarea
    attributes:
      label: Steps To Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. In this environment...
        2. With this config...
        3. Run '...'
        4. See error...
  - type: textarea
    id: workaround
    attributes:
      label: Workaround (if any)
      description: Any manual steps that allow you to resolve the issue
      placeholder: Tell us the steps you followed to resolve the issue!
    validations:
      required: false
  - type: dropdown
    id: browsers
    attributes:
      label: What browsers are you seeing the problem on?
      multiple: true
      options:
        - Firefox
        - Chrome
        - Safari
        - Microsoft Edge
    validations:
      required: false
  - type: textarea
    id: anything-else
    attributes:
      label: Anything else
      description: Any additional information you'd like to share
    validations:
      required: false