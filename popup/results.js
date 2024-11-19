// Get and display the analysis results
chrome.storage.local.get([`analysis_${chrome.tabs.TAB_ID}`], (result) => {
    const analysis = result[`analysis_${chrome.tabs.TAB_ID}`];
    if (analysis) {
        document.getElementById('analysis').innerHTML = analysis.replace(/\n/g, '<br>');
        // Clean up after displaying
        chrome.storage.local.remove(`analysis_${chrome.tabs.TAB_ID}`);
    }
}); 