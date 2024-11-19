document.addEventListener('DOMContentLoaded', async () => {
    console.debug('Initializing popup');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.startsWith('https://github.com/')) {
            showError('Please navigate to a GitHub repository');
            return;
        }

        showLoading();
        
        // Extract repo data
        const [repoData] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.extractRepoData()
        });
        console.log(repoData);

        if (repoData.result) {
            await analyzeWithAI(repoData.result);
        } else {
            throw new Error('Failed to extract repository data');
        }
    } catch (error) {
        console.error('Popup initialization error:', error);
        showError(error.message);
    }
});

async function analyzeWithAI(repoData) {
    console.debug('Starting AI analysis');

    try {
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();

        console.log(capabilities);
        
        if (capabilities.available === 'no') {
            throw new Error('AI model is not available');
        }

        const session = await chrome.aiOriginTrial.languageModel.create();

        console.log(session);
        
        const prompt = `
            Analyze this GitHub repository and provide a concise summary:
            
            Repository: ${repoData.title}
            Description: ${repoData.description}
            Technologies: ${repoData.technologies.join(', ')}
            Infrastructure: ${repoData.infrastructure.join(', ')}
            
            README content:
            ${repoData.readme}
            
            Please provide:
            1. A brief overview of the project
            2. Main features and functionality
            3. Technical architecture (if infrastructure details are available)
            4. Getting started guide
            
            Keep the response concise and well-structured.
        `;
        console.log(prompt);

        const result = await session.prompt(prompt);
        showResults(result);
        session.destroy();
    } catch (error) {
        console.error('AI analysis error:', error);
        showError('Failed to analyze repository with AI');
    }
}

function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function showLoading() {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
}

function showResults(analysis) {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    const resultsElement = document.getElementById('results');
    const summaryElement = document.getElementById('summary');
    summaryElement.innerHTML = analysis.replace(/\n/g, '<br>');
    resultsElement.classList.remove('hidden');
} 