let session = null;

// UI Elements
const analyzeButton = document.getElementById('analyze-button');
const resetButton = document.getElementById('reset-button');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const resultsElement = document.getElementById('results');
const analysisElement = document.getElementById('analysis');

async function initializeAI() {
    const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
    if (capabilities.available !== 'readily') {
        throw new Error(`AI model not available (state: "${capabilities.available}")`);
    }
    return capabilities;
}

async function runPrompt(prompt) {
    try {
        if (!session) {
            session = await chrome.aiOriginTrial.languageModel.create({
                systemPrompt: 'You are a helpful technical assistant that analyzes GitHub repositories.'
            });
        }
        return await session.prompt(prompt);
    } catch (error) {
        console.error('Prompt failed:', error);
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
    show(analyzeButton);
}

async function analyzeRepo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url?.startsWith('https://github.com/')) {
            throw new Error('Please navigate to a GitHub repository');
        }

        show(loadingElement);
        hide(analyzeButton);
        hide(errorElement);
        hide(resultsElement);

        // Initialize AI capabilities
        await initializeAI();

        // Extract repo data
        const [repoData] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/repoAnalyzer.js']
        });

        if (!repoData.result) {
            throw new Error('Failed to extract repository data');
        }

        console.log(repoData.result);

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
            
            Format the response in plain english with no markdown, no special characters, no html.
            Just add paragraphs and line breaks where appropriate.
        `;

        const response = await runPrompt(prompt);
        showResults(response);
        show(resetButton);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
        show(analyzeButton);
    }
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
    analyzeButton.addEventListener('click', analyzeRepo);
    resetButton.addEventListener('click', reset);
}); 