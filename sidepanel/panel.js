let session = null;
let fileData = null;

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
        console.log(prompt);
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
    const API_ENDPOINT = 'http://localhost:8082/analyze-with-gemini';

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        throw new Error('Failed to get response from API');
    }

    const data = await response.json();
    return data;
}

// Updated function to explain the current file using GitHub API for fetching file content
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
        hide(fileSelectionElement);

        // Get repository info and file path
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/fileAnalyzer.js']
        });

        if (!result || !result.result) {
            throw new Error('Failed to extract file data');
        }

        fileData = result.result;
        console.debug('[Panel] File data:', fileData);

        // Fetch the raw content of the current file using the GitHub API
        const currentFileContent = await fetchFileContent(fileData.owner, fileData.repo, fileData.branch, fileData.filePath);

        window.currentFileContent = currentFileContent;

        // Proceed with explanation immediately
        await getExplanation([window.currentFileContent]);

        // After explanation, if there are additional files, offer the option to select them
        const availableFiles = await fetchRepoFiles(fileData.owner, fileData.repo, fileData.branch);

        if (availableFiles.length > 0) {
            fileData.availableFiles = availableFiles;
            show(additionalFilesPromptElement);
        }

        show(resetButton);

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
    try {
        console.debug(`[Panel] Fetching content for ${filePath} in ${owner}/${repo}@${branch}`);
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
        console.debug(`[Panel] Fetched content length for ${filePath}:`, content.length);
        return content;
    } catch (error) {
        console.error(`[Panel] Error fetching ${filePath}:`, error);
        throw error;
    }
}

// Function to fetch the list of files in the repository
async function fetchRepoFiles(owner, repo, branch) {
    try {
        console.debug(`[Panel] Fetching repo files for ${owner}/${repo}@${branch}`);
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch repository files: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const files = data.tree.filter(item => item.type === 'blob');
        console.debug(`[Panel] Found ${files.length} files in repository`);
        return files;
    } catch (error) {
        console.error('[Panel] Failed to fetch repository files:', error);
        return [];
    }
}

// Function to get the explanation from the AI model
async function getExplanation(fileContents) {
    try {
        const combinedContent = fileContents.join('\n\n');
        const prompt = `
            Explain the following code in detail:

            ${combinedContent}

            Highlight the key functionalities and how the components interact.
            Format the response in plain English with no markdown, no special characters, no HTML. Just add paragraphs and line breaks where appropriate.
        `;

        // Use built-in model for explanation
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
    populateFileList(fileData.availableFiles);
    show(fileSelectionElement);
    hide(additionalFilesPromptElement);
});

// Adjust the fetchExplanationButton event listener
fetchExplanationButton.addEventListener('click', async () => {
    try {
        show(loadingElement);
        hide(errorElement);
        hide(resultsElement);

        const selectedFiles = Array.from(fileListElement.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        // Fetch content of selected files
        const fileContents = [window.currentFileContent]; // Start with current file content

        if (selectedFiles.length > 0) {
            const additionalContents = await Promise.all(selectedFiles.map(async (filePath) => {
                return await fetchFileContent(fileData.owner, fileData.repo, fileData.branch, filePath);
            }));
            fileContents.push(...additionalContents);
        }

        // Get combined explanation
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