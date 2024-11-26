function getRepoOwnerAndName() {
    const pathParts = window.location.pathname.split('/');
    return {
      owner: pathParts[1],
      name: pathParts[2],
    };
  }
  async function fetchRepoData(owner, repo) {
    try {
      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await fetch(repoUrl);
      if (!response.ok) {
        console.error(`[fetchRepoData] Failed with status: ${response.status}`);
        throw new Error(`Failed to fetch repository data: ${response.status}`);
      }
      console.info('[fetchRepoData] Successfully fetched repo data');
      return response.json();
    } catch (error) {
      console.error('[fetchRepoData] Error:', error.message);
      throw error;
    }
  }

  async function fetchReadme(owner, repo) {
    try {
      const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
      const response = await fetch(readmeUrl, {
        headers: { Accept: 'application/vnd.github.VERSION.raw' },
      });
      if (!response.ok) {
        console.info('[fetchReadme] No README found');
        return ''; // README might not exist
      }
      console.info('[fetchReadme] Successfully fetched README');
      return response.text();
    } catch (error) {
      console.error('[fetchReadme] Error:', error.message);
      throw error;
    }
  }

  async function fetchLanguages(owner, repo) {
    try {
      const languagesUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
      const response = await fetch(languagesUrl);
      if (!response.ok) {
        console.error(`[fetchLanguages] Failed with status: ${response.status}`);
        return [];
      }
      const languagesData = await response.json();
      console.info('[fetchLanguages] Successfully fetched languages');
      return Object.keys(languagesData);
    } catch (error) {
      console.error('[fetchLanguages] Error:', error.message);
      throw error;
    }
  }
  async function fetchInfraFiles(owner, repo) {
    const infraPatterns = [
      'Dockerfile',
      'docker-compose.yml',
      'kubernetes',
      'terraform',
      '.github/workflows',
      'nginx.conf',
      'serverless.yml',
    ];
  
    async function fetchFilesRecursively(path = '') {
      const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const response = await fetch(contentsUrl);
      if (!response.ok) {
        return [];
      }
      const items = await response.json();
      let infraFiles = [];
  
      for (const item of items) {
        if (item.type === 'file' && infraPatterns.some(pattern => item.path.includes(pattern))) {
          infraFiles.push(item.path);
        } else if (item.type === 'dir') {
          const nestedFiles = await fetchFilesRecursively(item.path);
          infraFiles = infraFiles.concat(nestedFiles);
        }
      }
      return infraFiles;
    }
  
    return fetchFilesRecursively();
  }

  function parseMarkdown(text) {
    if (!text) return '';
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // Remove inline code
    text = text.replace(/`[^`]*`/g, '');
    
    // Remove headers
    text = text.replace(/#{1,6}\s+/g, '');
    
    // Remove bold/italic
    text = text.replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, '$1');
    
    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove images
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Remove horizontal rules
    text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '');
    
    // Remove blockquotes
    text = text.replace(/^\s*>\s+/gm, '');
    
    // Remove list markers
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');
    
    // Clean up extra whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.trim();
    
    return text;
  }

  (async () => {
    try {
      const { owner, name } = getRepoOwnerAndName();
      console.info('[main] Starting repository analysis for', owner + '/' + name);
  
      const [repoData, readmeContent, languages, infrastructure] = await Promise.all([
        fetchRepoData(owner, name),
        fetchReadme(owner, name),
        fetchLanguages(owner, name),
        fetchInfraFiles(owner, name),
      ]);
  
      // Collect files data for context
      const filesData = await fetchFilesContent(owner, name, infrastructure);
  
      return {
        title: repoData.name,
        description: repoData.description,
        readme: parseMarkdown(readmeContent),
        technologies: languages,
        infrastructure: infrastructure,
        filesContent: filesData,
      };
    } catch (error) {
      console.error(error);
      // Fallback or error handling logic
      return {
        title: '',
        description: '',
        readme: '',
        technologies: [],
        infrastructure: [],
        filesContent: {},
      };
    }
  })();
  
  // New function to fetch files content
  async function fetchFilesContent(owner, repo, filePaths) {
    const fileContents = {};
    for (const filePath of filePaths) {
        try {
            const content = await fetchFileContent(owner, repo, filePath);
            fileContents[filePath] = content;
        } catch (error) {
            console.error(`Failed to fetch content for ${filePath}:`, error);
        }
    }
    return fileContents;
  }

  async function fetchFileContent(owner, repo, filePath) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3.raw'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }
  