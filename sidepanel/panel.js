let session = null;
let fileData = null;

console.log('Initializing UI elements');
// UI Elements
const analyzeBuiltInButton = document.getElementById('analyze-built-in');
const analyzeApiButton = document.getElementById('analyze-api');
const explainFileButton = document.getElementById('explain-file');
const resetButton = document.getElementById('reset-button');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const resultsElement = document.getElementById('results');
const analysisElement = document.getElementById('analysis');
const fileSelectionElement = document.getElementById('file-selection');
const fileListElement = document.getElementById('file-list');
const fetchExplanationButton = document.getElementById('fetch-explanation');
const additionalFilesPromptElement = document.getElementById('additional-files-prompt');
const additionalFilesButton = document.getElementById('additional-files-button');
const chatContainer = document.getElementById('chat-container');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const modal = document.getElementById('modal');

// Variables
let chatSession = null;
let contextData = ''; // To hold additional context like files

console.log('Adding helper functions');
// Add these helper functions at the top with other utility functions
function isGitHubFileUrl(url) {
    console.log('Checking if URL is GitHub file:', url);
    return url?.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/.+/);
}

function isGitHubRepoRoot(url) {
    console.log('Checking if URL is GitHub repo root:', url);
    // Matches either the repo root or /tree/branch pattern
    return url?.match(/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\/tree\/[^/]+)?$/);
}

// Add this function to update button visibility
async function updateButtonVisibility() {
    console.log('Updating button visibility');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url) {
            console.log('No URL found in current tab');
            return;
        }

        const isFile = isGitHubFileUrl(tab.url);
        const isRepoRoot = isGitHubRepoRoot(tab.url);

        console.log('URL analysis:', { isFile, isRepoRoot });

        // Update button visibility based on URL
        if (isFile) {
            console.log('Showing file explanation button');
            show(explainFileButton);
            hide(analyzeBuiltInButton);
            hide(analyzeApiButton);
        } else if (isRepoRoot) {
            console.log('Showing repo analysis buttons');
            hide(explainFileButton);
            show(analyzeBuiltInButton);
            show(analyzeApiButton);
        } else {
            console.log('Hiding all buttons - not on relevant GitHub page');
            // Hide all buttons if not in a relevant GitHub page
            hide(explainFileButton);
            hide(analyzeBuiltInButton);
            hide(analyzeApiButton);
        }
    } catch (error) {
        console.error('Error updating button visibility:', error);
    }
}

console.log('Setting up event listeners');
// Call updateButtonVisibility when the panel is opened
document.addEventListener('DOMContentLoaded', updateButtonVisibility);

// Listen for tab updates to refresh button visibility
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log('Tab URL changed, updating button visibility');
        updateButtonVisibility();
    }
});

async function initializeAI() {
    console.log('Initializing AI capabilities');
    try {
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
        console.log('AI capabilities:', capabilities);
        if (capabilities.available !== 'readily') {
            const error = `AI model not available (state: "${capabilities.available}")`;
            console.error(error);
            throw new Error(error);
        }
        console.info('AI capabilities initialized successfully');
        return capabilities;
    } catch (error) {
        console.error('Failed to initialize AI capabilities:', error);
        throw error;
    }
}

async function runPrompt(prompt) {
    console.log('Running AI prompt');
    try {
        if (!session) {
            console.info('Creating new AI session');
            session = await chrome.aiOriginTrial.languageModel.create({
                systemPrompt: 'You are a helpful technical assistant that analyzes GitHub repositories.'
            });
        }
        console.log('Running prompt:', prompt.substring(0, 100) + '...');
        return await session.prompt(prompt.substring(0, 1500)); // limiting due to token limit
    } catch (error) {
        console.error('Prompt execution failed:', error);
        await reset();
        throw error;
    }
}

async function reset() {
    console.log('Resetting application state');
    if (session) {
        console.log('Destroying AI session');
        await session.destroy();
        session = null;
    }
    hide(loadingElement);
    hide(errorElement);
    hide(resultsElement);
    hide(resetButton);
    show(analyzeBuiltInButton);
    show(analyzeApiButton);
    show(explainFileButton);
}

async function analyzeRepo(useBuiltInModel) {
    console.log(`Starting repository analysis with ${useBuiltInModel ? 'built-in model' : 'API'}`);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url?.startsWith('https://github.com/')) {
            console.warn('Invalid URL - not a GitHub repository');
            throw new Error('Please navigate to a GitHub repository');
        }

        console.info(`Starting repository analysis using ${useBuiltInModel ? 'built-in model' : 'API'}`);

        show(loadingElement);
        hide(analyzeBuiltInButton);
        hide(analyzeApiButton);
        hide(explainFileButton);
        hide(errorElement);
        hide(resultsElement);
        hide(fileSelectionElement);

        // Initialize AI capabilities
        if (useBuiltInModel) {
            await initializeAI();
        }

        // Extract repo data
        console.log('Executing repo analyzer script');
        const [repoData] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/repoAnalyzer.js']
        });

        console.log('Raw repo data:', repoData);

        if (!repoData.result) {
            console.error('Repository data extraction failed');
            throw new Error('Failed to extract repository data');
        }

        console.log('Repository data extracted successfully:', {
            title: repoData.result.title,
            technologies: repoData.result.technologies.length
        });

        const prompt = `
            Analyze this GitHub repository and provide a concise summary
            Format the response in plain english with no markdown, no special characters, no html. Just add paragraphs and line breaks where appropriate:
            
            Repository: ${repoData.result.title}
            Description: ${repoData.result.description}
            Technologies: ${repoData.result.technologies.join(', ')}
            Infrastructure: ${repoData.result.infrastructure.join(', ')}
            
            README content:
            ${repoData.result.readme}
            
            Please provide:
            1. Brief overview
            2. Main features and functionality
            3. Technical architecture (if infrastructure details are available)
            4. Getting started guide
        `;
        console.log('Generated prompt:', prompt.substring(0, 100) + '...');
        let response;
        if (useBuiltInModel) {
            // Use built-in model
            console.log('Using built-in AI model');
            response = await runPrompt(prompt);
        } else {
            // Send data to external API
            console.log('Using external API');
            response = await analyzeWithApi(prompt);
        }

        console.log('Got analysis response');
        showResults(response);
        show(resetButton);

        // After analysis, set contextData for chat
        contextData = `Repository Analysis:\n${response}`;

    } catch (error) {
        console.error('Repository analysis failed:', error);
        showError(error.message);
        show(analyzeBuiltInButton);
        show(analyzeApiButton);
        show(explainFileButton);
    }
}

async function analyzeWithApi(prompt) {
    console.log('Sending analysis request to API');
    // Replace with your API endpoint and API key
    const API_ENDPOINT = 'http://localhost:8082/analyze-with-gemini';

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        throw new Error('Failed to get response from API');
    }

    const data = await response.json();
    console.log('Received API response');
    return data;
}

// Updated function to explain the current file using GitHub API for fetching file content
async function explainCurrentFile() {
    console.log('Starting file explanation');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url?.startsWith('https://github.com/')) {
            throw new Error('Please navigate to a GitHub file page');
        }

        show(loadingElement);
        hide(analyzeBuiltInButton);
        hide(analyzeApiButton);
        hide(explainFileButton);
        hide(errorElement);
        hide(resultsElement);
        hide(fileSelectionElement);

        // Get repository info and file path
        console.log('Executing file analyzer script');
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/fileAnalyzer.js']
        });

        console.log('File analyzer result:', result);

        if (!result || !result.result) {
            throw new Error('Failed to extract file data');
        }

        fileData = result.result;
        console.log('[Panel] File data:', fileData);

        // Fetch the raw content of the current file using the GitHub API
        console.log('Fetching current file content');
        const currentFileContent = await fetchFileContent(fileData.owner, fileData.repo, fileData.branch, fileData.filePath);

        window.currentFileContent = currentFileContent;

        // Proceed with explanation immediately
        console.log('Getting file explanation');
        await getExplanation([window.currentFileContent]);

        // After explanation, if there are additional files, offer the option to select them
        console.log('Fetching repo files');
        const availableFiles = await fetchRepoFiles(fileData.owner, fileData.repo, fileData.branch);

        if (availableFiles.length > 0) {
            console.log(`Found ${availableFiles.length} additional files`);
            fileData.availableFiles = availableFiles;
            show(additionalFilesPromptElement);
        }

        show(resetButton);

        // After explanation, set contextData for chat
        contextData = `File Explanation:\n${analysisElement.textContent}`;

    } catch (error) {
        console.error('[Panel] File explanation error:', error);
        showError(error.message);
        show(analyzeBuiltInButton);
        show(analyzeApiButton);
        show(explainFileButton);
    } finally {
        hide(loadingElement);
    }
}

// Function to fetch the raw content of a file using the GitHub API
async function fetchFileContent(owner, repo, branch, filePath) {
    console.log(`[Panel] Fetching content for ${filePath} in ${owner}/${repo}@${branch}`);
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        console.log(`[Panel] Fetched content length for ${filePath}:`, content.length);
        return content;
    } catch (error) {
        console.error(`[Panel] Error fetching ${filePath}:`, error);
        throw error;
    }
}

// Function to fetch the list of files in the repository
async function fetchRepoFiles(owner, repo, branch) {
    console.log(`[Panel] Fetching repo files for ${owner}/${repo}@${branch}`);
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch repository files: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const files = data.tree.filter(item => item.type === 'blob');
        console.log(`[Panel] Found ${files.length} files in repository`);
        return files;
    } catch (error) {
        console.error('[Panel] Failed to fetch repository files:', error);
        return [];
    }
}

// Function to get the explanation from the AI model
async function getExplanation(fileContents) {
    console.log('Getting explanation for files');
    try {
        const combinedContent = fileContents.join('\n\n');
        const prompt = `
            Explain the following code in detail
            Highlight the key functionalities and how the components interact.
            Format the response in plain English with no markdown, no special characters, no HTML:
            ///////////////////////////////////////////
            ${combinedContent}
            ///////////////////////////////////////////
            
        `;

        // Use built-in model for explanation
        console.log('Running explanation prompt');
        const response = await runPrompt(prompt);
        showResults(response);
        show(resetButton);
    } catch (error) {
        console.error('Get explanation error:', error);
        showError(error.message);
        show(analyzeBuiltInButton);
        show(analyzeApiButton);
        show(explainFileButton);
    }
}

// Populating the file list for selection
function populateFileList(files) {
    console.log('Populating file list with', files.length, 'files');
    fileListElement.innerHTML = '';
    files.forEach(file => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = file.path;
        checkbox.id = file.path;

        const label = document.createElement('label');
        label.htmlFor = file.path;
        label.textContent = file.path;

        const listItem = document.createElement('div');
        listItem.appendChild(checkbox);
        listItem.appendChild(label);

        fileListElement.appendChild(listItem);
    });
}

// Event listener for the 'Select Additional Files' button
additionalFilesButton.addEventListener('click', () => {
    console.log('Additional files button clicked');
    populateFileList(fileData.availableFiles);
    show(fileSelectionElement);
    hide(additionalFilesPromptElement);
});

// Adjust the fetchExplanationButton event listener
fetchExplanationButton.addEventListener('click', async () => {
    console.log('Fetch explanation button clicked');
    try {
        show(loadingElement);
        hide(errorElement);
        hide(resultsElement);

        const selectedFiles = Array.from(fileListElement.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        console.log('Selected additional files:', selectedFiles);

        // Fetch content of selected files
        const fileContents = [window.currentFileContent]; // Start with current file content

        if (selectedFiles.length > 0) {
            console.log('Fetching content of selected files');
            const additionalContents = await Promise.all(selectedFiles.map(async (filePath) => {
                return await fetchFileContent(fileData.owner, fileData.repo, fileData.branch, filePath);
            }));
            fileContents.push(...additionalContents);
        }

        // Get combined explanation
        console.log('Getting combined explanation');
        await getExplanation(fileContents);

    } catch (error) {
        console.error('Error fetching explanation:', error);
        showError(error.message);
    } finally {
        hide(loadingElement);
        hide(fileSelectionElement);
        show(resetButton);
    }
});

function showError(message) {
    console.error('Showing error:', message);
    errorElement.textContent = message;
    show(errorElement);
}

function showResults(response) {
    console.log('Showing results');
    hide(loadingElement);
    analysisElement.textContent = response;
    show(resultsElement);
}

function show(element) {
    console.log('Showing element:', element.id);
    element.removeAttribute('hidden');
}

function hide(element) {
    console.log('Hiding element:', element.id);
    element.setAttribute('hidden', '');
}

// Function to start chat session
function startChat() {
    console.log('Starting chat session');
    hide(modal);
    show(chatContainer);
    show(resetButton);
    resetButton.addEventListener('click', resetChat);
}

// Event listener for send button
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    console.log('Sending chat message');
    // Display user message
    addMessageToChat('User', userMessage);
    chatInput.value = '';

    try {
        // Initialize session if not already done
        if (!chatSession) {
            console.log('Initializing chat session');
            chatSession = await chrome.aiOriginTrial.languageModel.create({
                systemPrompt: 'You are a helpful assistant for GitHub repositories.'
            });
        }

        // Prepare prompt with context if any
        let prompt = userMessage;
        if (contextData) {
            prompt += `\n\nContext:\n${contextData}`;
        }

        console.log('Sending message to AI');
        // Send message to AI model
        const response = await chatSession.prompt(prompt);

        // Display AI response
        addMessageToChat('AI', response);

    } catch (error) {
        console.error('Chat error:', error);
        addMessageToChat('Error', 'An error occurred while processing your request.');
    }
}

// Function to add message to chat window
function addMessageToChat(sender, message) {
    console.log(`Adding ${sender} message to chat`);
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender.toLowerCase());
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to reset chat
function resetChat() {
    console.log('Resetting chat');
    chatSession = null;
    chatWindow.innerHTML = '';
    hide(chatContainer);
    show(modal);
    hide(resetButton);
}

// Modify button event listeners to start chat
analyzeBuiltInButton.addEventListener('click', async () => {
    console.log('Analyze with built-in model clicked');
    try {
        await analyzeRepo(true); // Existing function
        startChat();
    } catch (error) {
        showError(error.message);
    }
});

analyzeApiButton.addEventListener('click', async () => {
    console.log('Analyze with API clicked');
    try {
        await analyzeRepo(false); // Existing function
        startChat();
    } catch (error) {
        showError(error.message);
    }
});

explainFileButton.addEventListener('click', async () => {
    console.log('Explain file button clicked');
    try {
        await explainCurrentFile(); // Existing function
        startChat();
    } catch (error) {
        showError(error.message);
    }
});

// Initialize
// document.addEventListener('DOMContentLoaded', () => {
//     analyzeBuiltInButton.addEventListener('click', () => analyzeRepo(true));
//     analyzeApiButton.addEventListener('click', () => analyzeRepo(false));
//     explainFileButton.addEventListener('click', explainCurrentFile);
//     resetButton.addEventListener('click', reset);
// }); 