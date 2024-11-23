let session = null;

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

async function initializeAI() {
    try {
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
        console.log(capabilities);
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
    try {
        if (!session) {
            console.info('Creating new AI session');
            session = await chrome.aiOriginTrial.languageModel.create({
                systemPrompt: 'You are a helpful technical assistant that analyzes GitHub repositories.'
            });
        }
        console.debug('Running prompt:', prompt.substring(0, 100) + '...');
        return await session.prompt(prompt);
    } catch (error) {
        console.error('Prompt execution failed:', error);
        await reset();
        throw error;
    }
}

async function reset() {
    if (session) {
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
        const [repoData] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/repoAnalyzer.js']
        });

        console.log(repoData);

        if (!repoData.result) {
            console.error('Repository data extraction failed');
            throw new Error('Failed to extract repository data');
        }

        console.debug('Repository data extracted successfully:', {
            title: repoData.result.title,
            technologies: repoData.result.technologies.length
        });

        const prompt = `
            Analyze this GitHub repository and provide a concise summary:
            
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

            Format the response in plain english with no markdown, no special characters, no html. Just add paragraphs and line breaks where appropriate.
        `;

        let response;
        if (useBuiltInModel) {
            // Use built-in model
            console.log(prompt);
            response = await runPrompt(prompt);
        } else {
            // Send data to external API
            response = await analyzeWithApi(prompt);
        }

        showResults(response);
        show(resetButton);

    } catch (error) {
        console.error('Repository analysis failed:', error);
        showError(error.message);
        show(analyzeBuiltInButton);
        show(analyzeApiButton);
        show(explainFileButton);
    }
}

async function analyzeWithApi(prompt) {
    // Replace with your API endpoint and API key
    const API_ENDPOINT = 'https://your-api-endpoint.com/analyze';
    const API_KEY = 'YOUR_API_KEY';

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        throw new Error('Failed to get response from API');
    }

    const data = await response.json();
    return data.result;
}

// New function to explain the current file
async function explainCurrentFile() {
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

        // Check if on a file page
        const isFilePage = tab.url.includes('/blob/');
        if (!isFilePage) {
            throw new Error('Please navigate to a specific file on GitHub');
        }

        // Get file content and available files (using content script)
        const [fileData] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/fileAnalyzer.js']
        });

        if (!fileData.result) {
            throw new Error('Failed to extract file data');
        }

        // Show file selection UI if there are additional files
        if (fileData.result.availableFiles.length > 0) {
            populateFileList(fileData.result.availableFiles);
            show(fileSelectionElement);
            // Store the current file content
            window.currentFileContent = fileData.result.content;
        } else {
            // If no additional files, proceed with explanation
            await getExplanation([fileData.result.content]);
        }

    } catch (error) {
        console.error('File explanation error:', error);
        showError(error.message);
        show(analyzeBuiltInButton);
        show(analyzeApiButton);
        show(explainFileButton);
    }
}

// Fetch explanation with selected files
async function getExplanation(selectedFileContents) {
    try {
        const combinedContent = selectedFileContents.join('\n\n');
        const prompt = `
            Explain the following code in detail:
            
            ${combinedContent}
            
            Highlight the key functionalities and how the components interact.
            Format the response in markdown.
        `;

        // Use built-in model for explanation (could add option to use API)
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

// Populate the file list for selection
function populateFileList(files) {
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

// Event listener for fetching explanation
fetchExplanationButton.addEventListener('click', async () => {
    try {
        show(loadingElement);
        hide(errorElement);
        hide(resultsElement);

        const selectedFiles = Array.from(fileListElement.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        // Fetch content of selected files using background script
        const fileContents = [window.currentFileContent]; // Start with current file content

        if (selectedFiles.length > 0) {
            const additionalContents = await fetchSelectedFilesContent(selectedFiles);
            fileContents.push(...additionalContents);
        }

        await getExplanation(fileContents);

    } catch (error) {
        console.error('Error fetching explanation:', error);
        showError(error.message);
    } finally {
        hide(fileSelectionElement);
    }
});

// Fetch content of selected files using GitHub API
async function fetchSelectedFilesContent(filePaths) {
    // You need to generate a GitHub Personal Access Token and store it securely
    const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN';

    // Get repo details from current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const repoMatch = tab.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
        throw new Error('Failed to parse repository information');
    }

    const owner = repoMatch[1];
    const repo = repoMatch[2];

    const fileContents = [];

    for (const path of filePaths) {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}`);
        }

        const content = await response.text();
        fileContents.push(`// File: ${path}\n${content}`);
    }

    return fileContents;
}

function showError(message) {
    errorElement.textContent = message;
    show(errorElement);
}

function showResults(response) {
    hide(loadingElement);
    analysisElement.textContent = response;
    show(resultsElement);
}

function show(element) {
    element.removeAttribute('hidden');
}

function hide(element) {
    element.setAttribute('hidden', '');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    analyzeBuiltInButton.addEventListener('click', () => analyzeRepo(true));
    analyzeApiButton.addEventListener('click', () => analyzeRepo(false));
    explainFileButton.addEventListener('click', explainCurrentFile);
    resetButton.addEventListener('click', reset);
}); 