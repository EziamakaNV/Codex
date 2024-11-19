function getRepoOwnerAndName() {
    const pathParts = window.location.pathname.split('/');
    return {
      owner: pathParts[1],
      name: pathParts[2],
    };
  }
  async function fetchRepoData(owner, repo) {
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(repoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch repository data: ${response.status}`);
    }
    return response.json();
  }

  async function fetchReadme(owner, repo) {
    const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const response = await fetch(readmeUrl, {
      headers: { Accept: 'application/vnd.github.VERSION.raw' },
    });
    if (!response.ok) {
      return ''; // README might not exist
    }
    return response.text();
  }

  async function fetchLanguages(owner, repo) {
    const languagesUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
    const response = await fetch(languagesUrl);
    if (!response.ok) {
      return [];
    }
    const languagesData = await response.json();
    return Object.keys(languagesData);
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

  (async () => {
    try {
      const { owner, name } = getRepoOwnerAndName();
  
      const [repoData, readmeContent, languages, infrastructure] = await Promise.all([
        fetchRepoData(owner, name),
        fetchReadme(owner, name),
        fetchLanguages(owner, name),
        fetchInfraFiles(owner, name),
      ]);
  
      return {
        title: repoData.name,
        description: repoData.description,
        readme: "readmeContent",
        technologies: languages,
        infrastructure: infrastructure,
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
      };
    }
  })();
  