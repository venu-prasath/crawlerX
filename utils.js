function isSameDomain(url1, url2) {
    try {
        const domain1 = new URL(url1).hostname;
        const domain2 = new URL(url2).hostname;
        return domain1 === domain2;
    } catch {
        return false;
    }
}

function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        // Remove fragments and normalize
        parsed.hash = '';
        // Ensure trailing slash consistency
        if (parsed.pathname === '') {
            parsed.pathname = '/';
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    isSameDomain,
    normalizeUrl,
    isValidUrl
};
