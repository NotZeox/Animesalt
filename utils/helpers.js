/**
 * Helper Utilities for Anime Salt API
 * Common functions for scraping, parsing, and data transformation
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');

/**
 * Fetch HTML from URL with retry logic
 */
async function fetchHTML(url, options = {}) {
    const maxRetries = options.retries || config.request.retries;
    const timeout = options.timeout || config.request.timeout;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    ...config.request.headers,
                    ...options.headers,
                },
                timeout,
            });

            return response.data;
        } catch (error) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to fetch ${url}: ${error.message}`);
            }
            
            const delay = config.request.retryDelay * attempt;
            console.log(`[Fetch] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Get image URL handling lazy-loaded images
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
 * Normalize URL by adding protocol if needed
 */
function normalizeUrl(url) {
    if (!url) return null;
    
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    
    if (url.startsWith('/')) {
        return config.baseUrl + url;
    }
    
    return url;
}

/**
 * Extract anime ID from URL
 */
function extractIdFromUrl(url) {
    if (!url) return null;
    
    // Match patterns like: /series/naruto-shippuden/ or /movies/dragon-ball-super/
    const match = url.match(/\/(series|movies)\/([^\/]+)\/?$/);
    if (match) {
        return match[2];
    }
    
    // Match episode URLs: /episode/naruto-shippuden-1x1/
    const epMatch = url.match(/\/episode\/([^\/]+)-(\d+)x(\d+)\/?$/);
    if (epMatch) {
        return epMatch[1];
    }
    
    // Fallback: get last path segment
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

/**
 * Extract episode number from URL
 */
function extractEpisodeFromUrl(url) {
    if (!url) return null;
    
    // Match pattern: /episode/naruto-shippuden-1x1/
    const match = url.match(/episode\/[^\/]+-(\d+)x(\d+)/);
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
 * Parse anime item from search/results page
 */
function parseAnimeItem(element, options = {}) {
    const $el = element;
    
    // Get link and title
    const link = $el.find('a.lnk-blk').attr('href') || 
                 $el.find('a').first().attr('href');
    const title = $el.find('.entry-title').text().trim() || 
                  $el.find('.movies .tt').text().trim() ||
                  $el.find('.film-name').text().trim() ||
                  $el.find('h3.Title').text().trim();
    
    // Get poster
    const poster = getImageUrl($el.find('img'));
    
    // Extract metadata
    const quality = $el.find('.Qlty').text().trim() || 
                    $el.find('.post-ql').text().trim() ||
                    $el.find('.quality').text().trim();
    const year = $el.find('.year').text().trim();
    const type = $el.find('.type').text().trim();
    
    // Get Japanese title if available
    const japaneseTitle = $el.find('.jap-title').text().trim() || '';
    
    // Extract ID from URL
    const id = extractIdFromUrl(link);
    
    return {
        id: id,
        title: title || 'Unknown',
        japanese_title: japaneseTitle,
        poster: poster,
        link: normalizeUrl(link),
        quality: quality || 'HD',
        year: year || null,
        type: type || 'anime',
    };
}

/**
 * Parse TV info object
 */
function parseTvInfo(element) {
    const $el = element;
    
    return {
        showType: $el.find('.type').text().trim() || 'TV',
        duration: $el.find('.duration').text().trim() || '24 min',
        releaseDate: $el.find('.release-date').text().trim() || '',
        quality: $el.find('.quality').text().trim() || 'HD',
    };
}

/**
 * Sanitize text content
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
 * Parse HTML content and return cheerio instance
 */
function parseHtml(html) {
    return cheerio.load(html, {
        decodeEntities: true,
        xmlMode: false,
    });
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Rate limiter
 */
class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60000;
        this.max = options.max || 100;
        this.requests = new Map();
    }

    isAllowed(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        // Get existing requests for this key
        const requests = this.requests.get(key) || [];
        
        // Filter out old requests
        const recentRequests = requests.filter(time => time > windowStart);
        
        if (recentRequests.length >= this.max) {
            return false;
        }
        
        // Add current request
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        
        return true;
    }

    getRemaining(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const requests = this.requests.get(key) || [];
        const recentRequests = requests.filter(time => time > windowStart);
        
        return Math.max(0, this.max - recentRequests.length);
    }

    reset(key) {
        this.requests.delete(key);
    }
}

/**
 * Validate anime ID format
 */
function validateAnimeId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9-_]+$/.test(id);
}

/**
 * Parse language code from path
 */
function parseLanguageCode(path) {
    if (!path) return null;
    
    const match = path.match(/\/category\/language\/([^\/]+)/);
    if (match) {
        return match[1];
    }
    
    return null;
}

/**
 * Format API response
 */
function formatResponse(success, data, error = null) {
    const response = {
        success,
        timestamp: new Date().toISOString(),
    };

    if (success) {
        response.results = data;
    } else {
        response.error = error || 'Unknown error';
    }

    return response;
}

/**
 * Paginate results
 */
function paginate(results, page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
        data: results.slice(start, end),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(results.length / pageSize),
            totalItems: results.length,
            itemsPerPage: pageSize,
            hasNext: end < results.length,
            hasPrev: page > 1,
        },
    };
}

module.exports = {
    fetchHTML,
    getImageUrl,
    normalizeUrl,
    extractIdFromUrl,
    extractEpisodeFromUrl,
    parseAnimeItem,
    parseTvInfo,
    sanitizeText,
    parseHtml,
    sleep,
    generateId,
    debounce,
    RateLimiter,
    validateAnimeId,
    parseLanguageCode,
    formatResponse,
    paginate,
};
