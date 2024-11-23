chrome.runtime.onInstalled.addListener(() => {
  console.info('Extension installed');
  chrome.action.setBadgeText({ text: "SCAN" });
});

// Check if current tab is a GitHub repo and handle side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.startsWith('https://github.com/')) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  } else {
    console.log('Not a GitHub repository page');
  }
});

// Enable/disable extension icon based on URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isGitHubRepo = tab.url?.startsWith('https://github.com/');
    chrome.action.setIcon({
      path: {
        "16": isGitHubRepo ? "images/icon-16.png" : "images/icon-16.png",
        "32": isGitHubRepo ? "images/icon-32.png" : "images/icon-32.png",
        "48": isGitHubRepo ? "images/icon-48.png" : "images/icon-48.png",
        "128": isGitHubRepo ? "images/icon-148.png" : "images/icon-148.png"
      },
      tabId: tabId
    });
    //chrome.action.setEnabled(tabId, isGitHubRepo);
  }
}); 