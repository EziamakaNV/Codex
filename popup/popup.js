class PopupManager {
  static async initialize() {
    Logger.debug('Initializing popup');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.startsWith('https://github.com/')) {
        this.showError('Please navigate to a GitHub repository');
        return;
      }

      this.showLoading();
      
      // Extract repo data
      const [repoData] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => RepoDataExtractor.extractRepoData()
      });

      if (repoData.result) {
        await this.analyzeWithAI(repoData.result);
      } else {
        throw new Error('Failed to extract repository data');
      }
    } catch (error) {
      Logger.error('Popup initialization error:', error);
      this.showError(error.message);
    }
  }

  static async analyzeWithAI(repoData) {
    Logger.debug('Starting AI analysis');

    try {
      const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();
      
      if (capabilities.available === 'no') {
        throw new Error('AI model is not available');
      }

      const session = await chrome.aiOriginTrial.languageModel.create();
      
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

      const result = await session.prompt(prompt);
      this.showResults(result);
      session.destroy();
    } catch (error) {
      Logger.error('AI analysis error:', error);
      this.showError('Failed to analyze repository with AI');
    }
  }

  static showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }

  static showLoading() {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
  }

  static showResults(analysis) {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    const resultsElement = document.getElementById('results');
    const summaryElement = document.getElementById('summary');
    summaryElement.innerHTML = analysis.replace(/\n/g, '<br>');
    resultsElement.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => PopupManager.initialize()); 