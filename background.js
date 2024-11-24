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

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  if (tab.url?.startsWith('https://github.com/')) {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});

// Enable/disable extension icon based on URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isGitHubRepo = tab.url?.startsWith('https://github.com/');
    chrome.action.setIcon({
      path: {
        "16": isGitHubRepo ? "images/icon16.png" : "images/icon16.png",
        "19": isGitHubRepo ? "images/icon19.png" : "images/icon19.png",
        "32": isGitHubRepo ? "images/icon32.png" : "images/icon32.png",
        "38": isGitHubRepo ? "images/icon38.png" : "images/icon38.png",
        "48": isGitHubRepo ? "images/icon48.png" : "images/icon48.png",
        "128": isGitHubRepo ? "images/icon128.png" : "images/icon128.png"
      },
      tabId: tabId
    });
    //chrome.action.setEnabled(tabId, isGitHubRepo);
  }
}); 