/**
 * Helper Utilities - Common helper functions
 */

const config = require('../config');

/**
 * Parse episode format (SxEP) from text
 * @param {string} text - Text to parse
 * @returns {object} - Season and episode numbers
 */
function parseEpisodeFormat(text) {
    if (!text) return { season: 1, episode: null };

    const patterns = [
        /Season\s*(\d+)[\s\-]*EP[:\s]*(\d+)/i,
        /EP[:\s]*(\d+)/,
        /(\d+)x(\d+)/i,
        /Season\s*(\d+)[\s\-]*Episode[\s\-]*(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match.length === 3) {
                return { season: parseInt(match[1]), episode: parseInt(match[2]) };
            } else if (match.length === 2) {
                return { season: 1, episode: parseInt(match[1]) };
            }
        }
    }

    return { season: 1, episode: null };
}

/**
 * Parse timer string to seconds
 * @param {string} timerText - Timer text to parse
 * @returns {number|null} - Seconds or null
 */
function parseTimer(timerText) {
    if (!timerText) return null;

    const match = timerText.match(/(\d+)d\s*(\d+)h|(\d+)h\s*(\d+)m|(\d+)d|(\d+)h|(\d+)m/);
    if (!match) return null;

    let seconds = 0;
    const d = parseInt(match[1] || 0);
    const h = parseInt(match[2] || match[3] || 0);
    const m = parseInt(match[4] || match[5] || 0);

    seconds += d * 24 * 60 * 60;
    seconds += h * 60 * 60;
    seconds += m * 60;

    return seconds;
}

/**
 * Extract timer date from data-target attribute (Unix timestamp)
 * @param {string} dataTarget - Data target attribute value
 * @returns {string|null} - ISO date string or null
 */
function extractTimerDate(dataTarget) {
    if (!dataTarget) return null;

    // Check if it's a Unix timestamp (number)
    const timestamp = parseInt(dataTarget);
    if (!isNaN(timestamp)) {
        // Check if it's in seconds or milliseconds
        const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
        return date.toISOString();
    }

    return null;
}

/**
 * Extract ID from URL
 * @param {string} url - URL to extract ID from
 * @returns {string|null} - Extracted ID or null
 */
function extractIdFromUrl(url) {
    if (!url) return null;

    const match = url.match(/\/(series|movies|cartoon)\/([^\/]+)\/?$/);
    if (match) return match[2];

    const epMatch = url.match(/\/episode\/[^\/]+-(\d+)x(\d+)/);
    if (epMatch) return epMatch[1];

    return null;
}

/**
 * Normalize URL
 * @param {string} url - URL to normalize
 * @returns {string|null} - Normalized URL or null
 */
function normalizeUrl(url) {
    if (!url) return null;

    // Ensure it's a string
    if (typeof url !== 'string') return null;

    // Fix common URL corruption issues
    url = url.trim();

    // Fix duplicate URL issue
    if (url.includes(config.baseUrl + config.baseUrl)) {
        url = url.replace(config.baseUrl + config.baseUrl, config.baseUrl);
    }
    if (url.includes('https://animesalt.cchttps://animesalt.cc')) {
        url = url.replace('https://animesalt.cchttps://animesalt.cc', config.baseUrl);
    }

    // Ensure URL starts properly
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    if (url.startsWith('/')) {
        return config.baseUrl + url;
    }

    // Check if URL already contains base URL
    if (url.includes('animesalt.cc')) {
        if (!url.startsWith('http')) {
            return 'https://' + url;
        }
        return url;
    }

    // Validate URL structure
    const validPatterns = ['/episode/', '/series/', '/movies/', '/cartoon/'];
    if (!validPatterns.some(pattern => url.includes(pattern))) {
        return null;
    }

    return url;
}

/**
 * Get emoji icon for genre
 * @param {string} genreId - Genre ID
 * @returns {string} - Emoji icon
 */
function getGenreIcon(genreId) {
    if (!genreId) return '🎬';
    return config.genreIcons[genreId.toLowerCase()] || '🎬';
}

/**
 * Clean text content
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
    if (!text) return '';

    return text
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Get image URL handling lazy-loaded images
 * @param {object} element - Cheerio element
 * @returns {string|null} - Image URL or null
 */
function getImageUrl(element) {
    if (!element || element.length === 0) return null;
    
    const $el = element.first();
    
    // Try data-src first (lazy loading)
    const dataSrc = $el.attr('data-src') || $el.attr('data-lazy-src');
    if (dataSrc && !dataSrc.includes('svg+xml')) {
        return normalizeUrl(dataSrc);
    }
    
    // Try src
    const src = $el.attr('src');
    if (src && !src.includes('svg+xml')) {
        return normalizeUrl(src);
    }
    
    return null;
}

/**
 * Extract episode data from URL
 * @param {string} url - URL to extract from
 * @returns {object|null} - Episode data or null
 */
function extractEpisodeFromUrl(url) {
    if (!url) return null;
    
    // Match pattern: /episode/naruto-shippuden-1x1/
    const match = url.match(/episode\/[^-]+-(\d+)x(\d+)/);
    if (match) {
        return {
            season: parseInt(match[1]),
            episode: parseInt(match[2]),
            formatted: `${match[1]}x${match[2]}`,
        };
    }
    
    // Try query parameter: ?ep=123
    const queryMatch = url.match(/[?&]ep=(\d+)/);
    if (queryMatch) {
        return {
            season: 1,
            episode: parseInt(queryMatch[1]),
            formatted: `1x${queryMatch[1]}`,
        };
    }
    
    return null;
}

/**
 * Sanitize text content with HTML entity decoding
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
    if (!text) return '';
    
    return text
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

/**
 * Extract quality from text
 * @param {string} text - Text to extract quality from
 * @returns {string} - Quality string
 */
function extractQuality(text) {
    if (!text) return 'Unknown';

    for (const [quality, patterns] of Object.entries(config.qualityPatterns)) {
        if (patterns.some(pattern => text.toLowerCase().includes(pattern))) {
            return quality;
        }
    }

    return 'Unknown';
}

/**
 * Extract host from URL
 * @param {string} url - URL to extract host from
 * @returns {string} - Host name
 */
function extractHost(url) {
    if (!url) return 'Direct';

    for (const [pattern, host] of Object.entries(config.downloadHosts)) {
        if (url.includes(pattern)) {
            return host;
        }
    }

    return 'Direct';
}

/**
 * Get player name based on index and type
 * @param {number} index - Player index
 * @param {string} type - Player type (sub/dub)
 * @returns {string} - Player name
 */
function getPlayerName(index, type = 'sub') {
    const playerNum = index + 1;
    const typeLabel = type.toLowerCase() === 'dub' ? ' (Dub)' : ' (Sub)';
    return `HD ${playerNum}${typeLabel}`;
}

/**
 * Detect if content is regional (no sub/dub distinction)
 * Regional content has no sub/dub markers, only single language
 * @param {string} pageText - Page content text
 * @param {boolean} hasSub - Whether sub version exists
 * @param {boolean} hasDub - Whether dub version exists
 * @returns {boolean} - True if regional content
 */
function isRegionalContent(pageText, hasSub, hasDub) {
    // Regional content typically has no sub/dub indicators
    // If neither sub nor dub markers are found, it's regional
    if (!hasSub && !hasDub) {
        return true;
    }
    // If only one type is available but page doesn't indicate sub/dub anime
    const hasSubMarkers = pageText.includes('subtitles') || pageText.includes('subbed');
    const hasDubMarkers = pageText.includes('dubbed') || pageText.includes('dub version');
    // If it's not typical anime sub/dub content, treat as regional
    if ((hasSub || hasDub) && !hasSubMarkers && !hasDubMarkers) {
        return true;
    }
    return false;
}

/**
 * Get smart player name based on content type and availability
 * For regional content (no sub/dub): Player 1, Player 2
 * For dual audio content (sub and dub): HD 1 (Sub), HD 2 (Dub)
 * @param {number} index - Player index (0-based)
 * @param {string} type - Player type (sub/dub/mix)
 * @param {boolean} isRegional - Whether content is regional (no sub/dub)
 * @returns {string} - Smart player name
 */
function getSmartPlayerName(index, type = 'sub', isRegional = false) {
    if (isRegional) {
        // Regional content: Player 1, Player 2, Player 3...
        return `Player ${index + 1}`;
    }

    // Dual audio anime content: HD 1 (Sub), HD 2 (Dub)
    const playerNum = index + 1;
    if (type.toLowerCase() === 'dub') {
        return `HD ${playerNum} (Dub)`;
    }
    return `HD ${playerNum} (Sub)`;
}

/**
 * Get language from page text
 * @param {string} pageText - Page content text
 * @param {string} preferredLang - Preferred language
 * @returns {object} - Language info
 */
function detectLanguage(pageText, preferredLang = 'hindi') {
    const lang = preferredLang.toLowerCase();

    // Check for language indicators in page
    const hasHindi = pageText.includes('hindi') || pageText.includes('हिंदी');
    const hasEnglish = pageText.includes('english') || pageText.includes('eng');
    const hasJapanese = pageText.includes('japanese') || pageText.includes('jap');
    const hasTamil = pageText.includes('tamil') || pageText.includes('தமிழ்');
    const hasTelugu = pageText.includes('telugu') || pageText.includes('తెలుగు');

    // Determine which language to use based on preference and availability
    let resolvedLang = lang;
    let resolvedLangLabel = lang.charAt(0).toUpperCase() + lang.slice(1);

    // If preferred language is not available, try to find best match
    if (lang === 'hindi' && hasHindi) {
        resolvedLang = 'hindi';
        resolvedLangLabel = 'Hindi';
    } else if (lang === 'english' && hasEnglish) {
        resolvedLang = 'english';
        resolvedLangLabel = 'English';
    } else if (hasHindi && !hasEnglish) {
        resolvedLang = 'hindi';
        resolvedLangLabel = 'Hindi';
    } else if (hasEnglish) {
        resolvedLang = 'english';
        resolvedLangLabel = 'English';
    } else if (hasJapanese) {
        resolvedLang = 'japanese';
        resolvedLangLabel = 'Japanese';
    } else if (hasTamil) {
        resolvedLang = 'tamil';
        resolvedLangLabel = 'Tamil';
    } else if (hasTelugu) {
        resolvedLang = 'telugu';
        resolvedLangLabel = 'Telugu';
    } else {
        resolvedLang = 'original';
        resolvedLangLabel = 'Original';
    }

    return {
        preferred: lang,
        resolved: resolvedLang,
        resolvedLabel: resolvedLangLabel,
        hasHindi,
        hasEnglish,
        hasJapanese,
        hasTamil,
        hasTelugu,
    };
}

/**
 * Parse release year from date string
 * @param {string} dateString - Date string to parse
 * @returns {string|null} - Year or null
 */
function parseReleaseYear(dateString) {
    if (!dateString) return null;

    // Try to extract year
    const yearMatch = dateString.match(/(\d{4})/);
    if (yearMatch) {
        return yearMatch[1];
    }

    // Try to parse date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.getFullYear().toString();
    }

    return null;
}

/**
 * Validate content type from URL
 * @param {string} url - URL to validate
 * @returns {string} - Content type
 */
function getContentType(url) {
    if (!url) return config.contentTypes.SERIES;

    if (url.includes('/movies/')) return config.contentTypes.MOVIE;
    if (url.includes('/cartoon/')) return config.contentTypes.CARTOON;
    return config.contentTypes.SERIES;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay for specified milliseconds (alias for sleep)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after delay
 */
function delay(ms) {
    return sleep(ms);
}

/**
 * Generate random ID
 * @param {number} length - Length of ID
 * @returns {string} - Random ID
 */
function generateRandomId(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize text content (alias for cleanText)
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
    return cleanText(text);
}

module.exports = {
    parseEpisodeFormat,
    parseTimer,
    extractTimerDate,
    extractIdFromUrl,
    extractEpisodeFromUrl,
    normalizeUrl,
    getImageUrl,
    getGenreIcon,
    cleanText,
    sanitizeText,
    extractQuality,
    extractHost,
    getPlayerName,
    getSmartPlayerName,
    isRegionalContent,
    detectLanguage,
    parseReleaseYear,
    getContentType,
    sleep,
    delay,
    generateRandomId,
    truncate,
};
