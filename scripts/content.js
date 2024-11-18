class RepoDataExtractor {
  static async extractRepoData() {
    Logger.debug('Starting repository data extraction');

    try {
      // Check if we're on a GitHub repo page
      if (!this.isGitHubRepo()) {
        throw new Error('Not a GitHub repository page');
      }

      const repoData = {
        title: this.getRepoTitle(),
        description: this.getRepoDescription(),
        readme: await this.getReadmeContent(),
        technologies: this.getTechnologies(),
        infrastructure: this.getInfrastructureFiles(),
      };

      Logger.debug('Extracted repository data:', repoData);
      return repoData;
    } catch (error) {
      Logger.error('Error extracting repo data:', error);
      throw error;
    }
  }

  static isGitHubRepo() {
    return window.location.hostname === 'github.com' && 
           document.querySelector('[data-pjax="#js-repo-pjax-container"]') !== null;
  }

  static getRepoTitle() {
    const titleElement = document.querySelector('strong[itemprop="name"] a');
    return titleElement ? titleElement.textContent.trim() : '';
  }

  static getRepoDescription() {
    const descElement = document.querySelector('.f4.my-3');
    return descElement ? descElement.textContent.trim() : '';
  }

  static async getReadmeContent() {
    const readmeElement = document.querySelector('#readme article');
    return readmeElement ? readmeElement.textContent.trim() : '';
  }

  static getTechnologies() {
    const techElements = document.querySelectorAll('.Layout-sidebar .Progress');
    return Array.from(techElements).map(elem => {
      const label = elem.previousElementSibling;
      return label ? label.textContent.trim() : '';
    });
  }

  static getInfrastructureFiles() {
    const infraFiles = [
      'Dockerfile',
      'docker-compose.yml',
      'kubernetes/',
      'terraform/',
      '.github/workflows/',
      'nginx.conf',
      'serverless.yml'
    ];

    const fileElements = document.querySelectorAll('.js-navigation-item .js-navigation-open');
    return Array.from(fileElements)
      .map(elem => elem.textContent.trim())
      .filter(filename => infraFiles.some(inf => filename.includes(inf)));
  }
} 