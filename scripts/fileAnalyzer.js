(async () => {
    function getFileContent() {
        console.debug('[FileAnalyzer] Extracting file content...');
        const rawContentElement = document.querySelector('.blob-wrapper table');
        if (rawContentElement) {
            const lines = rawContentElement.querySelectorAll('tr .blob-code');
            const content = Array.from(lines).map(line => line.innerText).join('\n');
            console.debug(`[FileAnalyzer] Extracted file content (${content.length} characters).`);
            return content;
        }
        console.warn('[FileAnalyzer] No file content found.');
        return '';
    }

    function getRepoInfo() {
        console.debug('[FileAnalyzer] Extracting repository information from URL...');
        const urlParts = window.location.pathname.split('/');
        console.debug(`[FileAnalyzer] URL parts: ${urlParts}`);
        if (urlParts.length >= 5) {
            const info = {
                owner: urlParts[1],
                repo: urlParts[2],
                branch: urlParts[4],
            };
            console.debug(`[FileAnalyzer] Extracted repository info: ${JSON.stringify(info)}`);
            return info;
        }
        console.warn('[FileAnalyzer] Failed to extract repository information from URL.');
        return null;
    }

    async function getRepoFiles(owner, repo, branch) {
        console.debug(`[FileAnalyzer] Fetching repository files for ${owner}/${repo}@${branch}...`);
        
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            console.debug(`[FileAnalyzer] GitHub API URL: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const data = await response.json();
            const files = data.tree.filter(item => item.type === 'blob');
            console.debug(`[FileAnalyzer] Retrieved ${files.length} files from repository.`);
            return files;
        } catch (error) {
            console.error('[FileAnalyzer] Failed to fetch repository files:', error);
            throw error;
        }
    }

    try {
        console.debug('[FileAnalyzer] Starting file analysis...');
        const content = getFileContent();
        const repoInfo = getRepoInfo();
        
        if (!repoInfo) {
            throw new Error('Failed to parse repository information.');
        }

        const availableFiles = await getRepoFiles(repoInfo.owner, repoInfo.repo, repoInfo.branch);
        
        const result = {
            content,
            availableFiles,
        };
        console.debug('[FileAnalyzer] File analysis complete:', result);
        return result;
    } catch (error) {
        console.error('[FileAnalyzer] Error during file analysis:', error);
        return null;
    }
})(); 