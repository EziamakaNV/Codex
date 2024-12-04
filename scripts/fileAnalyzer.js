(() => {
    try {
        console.debug('[FileAnalyzer] Starting file analysis...');

        // Function to extract repository info from the current URL
        function getRepoInfo() {
            console.debug('[FileAnalyzer] Extracting repository information from URL...');
            const urlParts = window.location.pathname.split('/').filter(Boolean);
            console.debug(`[FileAnalyzer] URL parts: ${urlParts}`);
            if (urlParts.length >= 4 && urlParts[2] === 'blob') {
                const info = {
                    owner: urlParts[0],
                    repo: urlParts[1],
                    branch: urlParts[3],
                    filePath: urlParts.slice(4).join('/'),
                };
                console.debug(`[FileAnalyzer] Extracted repository info: ${JSON.stringify(info)}`);
                return info;
            }
            console.warn('[FileAnalyzer] Failed to extract repository information from URL.');
            return null;
        }

        const repoInfo = getRepoInfo();
        if (!repoInfo) {
            throw new Error('Failed to parse repository information.');
        }

        // Return the repository info and file path
        console.debug('[FileAnalyzer] File analysis complete:', repoInfo);
        return repoInfo;

    } catch (error) {
        console.error('[FileAnalyzer] Error during file analysis:', error);
        return null;
    }
})(); 