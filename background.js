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

// chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
//   if (!tab.url) return;
//   if (tab.url?.startsWith('https://github.com/')) {
//     await chrome.sidePanel.setOptions({
//       tabId,
//       enabled: true
//     });
//   } else {
//     // Disables the side panel on all other sites
//     await chrome.sidePanel.setOptions({
//       tabId,
//       enabled: false
//     });
//   }
// });

// Enable/disable extension icon based on URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isGitHubUrl = tab.url?.startsWith('https://github.com/');
    const isGitHubFile = tab.url?.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/.+/);
    const isGitHubRepo = tab.url?.match(/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\/tree\/[^/]+)?$/);

    // Enable the extension icon only on valid GitHub pages
    const shouldEnable = isGitHubFile || isGitHubRepo;

    chrome.action.setIcon({
      path: {
        "16": shouldEnable ? "images/icon16.png" : "images/icon16.png",
        "19": shouldEnable ? "images/icon19.png" : "images/icon19.png",
        "32": shouldEnable ? "images/icon32.png" : "images/icon32.png",
        "38": shouldEnable ? "images/icon38.png" : "images/icon38.png",
        "48": shouldEnable ? "images/icon48.png" : "images/icon48.png",
        "128": shouldEnable ? "images/icon128.png" : "images/icon128.png"
      },
      tabId: tabId
    });

    if(shouldEnable) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  }
}); 