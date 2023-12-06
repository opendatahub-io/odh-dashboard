export const navigateToStory = (folder: string, storyId: string) =>
  `./iframe.html?args=&id=tests-integration-${folder}--${storyId}&viewMode=story`;
