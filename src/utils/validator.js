/**
 * Validator Utility - Input validation for API endpoints
 * Provides comprehensive validation for all API parameters
 */

const config = require('../config');

/**
 * Validate anime/movie ID format
 * @param {string} id - The ID to validate
 * @returns {object} - Validation result with isValid and error message
 */
function validateId(id) {
    if (!id) {
        return { isValid: false, error: 'ID parameter is required' };
    }
    
    if (typeof id !== 'string') {
        return { isValid: false, error: 'ID must be a string' };
    }
    
    // Remove any whitespace
    id = id.trim();
    
    if (id.length === 0) {
        return { isValid: false, error: 'ID cannot be empty' };
    }
    
    // ID should contain only alphanumeric characters, hyphens, and underscores
    // This prevents path traversal and injection attacks
    const idPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!idPattern.test(id)) {
        return { isValid: false, error: 'ID contains invalid characters. Only alphanumeric, hyphens, and underscores are allowed.' };
    }
    
    // Prevent common attack patterns
    const dangerousPatterns = [
        /\.\./,           // Double dots (path traversal)
        /\//,             // Forward slashes
        /\\/,             // Backslashes
        /\0/,             // Null bytes
        /javascript:/i,   // JavaScript protocol
        /data:/i,         // Data protocol
        /vbscript:/i,     // VBScript protocol
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(id)) {
            return { isValid: false, error: 'ID contains invalid patterns' };
        }
    }
    
    return { isValid: true };
}

/**
 * Validate page number
 * @param {number|string} page - The page number to validate
 * @returns {object} - Validation result
 */
function validatePage(page) {
    const defaultPage = 1;
    
    if (page === undefined || page === null) {
        return { isValid: true, value: defaultPage };
    }
    
    const pageNum = parseInt(page);
    
    if (isNaN(pageNum)) {
        return { isValid: true, value: defaultPage };
    }
    
    if (pageNum < 1) {
        return { isValid: true, value: defaultPage };
    }
    
    if (pageNum > config.response.maxPages) {
        return { isValid: true, value: config.response.maxPages };
    }
    
    return { isValid: true, value: pageNum };
}

/**
 * Validate page size
 * @param {number|string} pageSize - The page size to validate
 * @returns {object} - Validation result
 */
function validatePageSize(pageSize) {
    const defaultSize = config.pagination.defaultPageSize;
    const maxSize = config.pagination.maxPageSize;
    
    if (pageSize === undefined || pageSize === null) {
        return { isValid: true, value: defaultSize };
    }
    
    const size = parseInt(pageSize);
    
    if (isNaN(size)) {
        return { isValid: true, value: defaultSize };
    }
    
    if (size < 1) {
        return { isValid: true, value: defaultSize };
    }
    
    if (size > maxSize) {
        return { isValid: true, value: maxSize };
    }
    
    return { isValid: true, value: size };
}

/**
 * Validate letter parameter
 * @param {string} letter - The letter to validate
 * @returns {object} - Validation result
 */
function validateLetter(letter) {
    if (!letter) {
        return { isValid: false, error: 'Letter parameter is required' };
    }
    
    if (typeof letter !== 'string') {
        return { isValid: false, error: 'Letter must be a string' };
    }
    
    letter = letter.trim().toUpperCase();
    
    if (letter.length !== 1) {
        return { isValid: false, error: 'Letter must be a single character' };
    }
    
    // Allow letters A-Z or digits 0-9
    const validPattern = /^[A-Z0-9]$/;
    if (!validPattern.test(letter)) {
        return { isValid: false, error: 'Letter must be A-Z or 0-9' };
    }
    
    return { isValid: true, value: letter };
}

/**
 * Validate search query
 * @param {string} query - The search query to validate
 * @returns {object} - Validation result
 */
function validateSearchQuery(query) {
    const minLength = 2;
    const maxLength = 200;
    
    if (!query) {
        return { isValid: false, error: 'Search query is required' };
    }
    
    if (typeof query !== 'string') {
        return { isValid: false, error: 'Search query must be a string' };
    }
    
    query = query.trim();
    
    if (query.length < minLength) {
        return { isValid: false, error: `Search query must be at least ${minLength} characters` };
    }
    
    if (query.length > maxLength) {
        return { isValid: false, error: `Search query must be less than ${maxLength} characters` };
    }
    
    // Sanitize the query - remove potential XSS vectors
    const sanitized = query
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    
    return { isValid: true, value: sanitized };
}

/**
 * Validate episode parameter
 * @param {string} episode - The episode parameter to validate
 * @returns {object} - Validation result
 */
function validateEpisode(episode) {
    if (!episode) {
        return { isValid: true, value: null }; // Default will be used
    }
    
    if (typeof episode !== 'string') {
        return { isValid: true, value: null };
    }
    
    episode = episode.trim();
    
    // Remove any query strings
    if (episode.includes('?')) {
        episode = episode.split('?')[0];
    }
    
    // Validate format: either just number (e.g., "5") or "SxEP" format (e.g., "1x5")
    const simpleNumPattern = /^\d+$/;
    const seasonEpPattern = /^\d+x\d+$/i;
    
    if (simpleNumPattern.test(episode) || seasonEpPattern.test(episode)) {
        return { isValid: true, value: episode };
    }
    
    return { isValid: true, value: null };
}

/**
 * Validate language parameter
 * @param {string} lang - The language parameter to validate
 * @returns {object} - Validation result
 */
function validateLanguage(lang) {
    const defaultLang = 'hindi';
    
    if (!lang) {
        return { isValid: true, value: defaultLang };
    }
    
    if (typeof lang !== 'string') {
        return { isValid: true, value: defaultLang };
    }
    
    const normalized = lang.trim().toLowerCase();
    
    // Only allow known languages to prevent injection
    const validLanguages = ['hindi', 'english', 'tamil', 'telugu', 'malayalam', 'bengali', 'japanese', 'korean', 'chinese'];
    
    if (validLanguages.includes(normalized)) {
        return { isValid: true, value: normalized };
    }
    
    return { isValid: true, value: defaultLang };
}

/**
 * Validate genre parameter
 * @param {string} genre - The genre to validate
 * @returns {object} - Validation result
 */
function validateGenre(genre) {
    if (!genre) {
        return { isValid: false, error: 'Genre parameter is required' };
    }
    
    if (typeof genre !== 'string') {
        return { isValid: false, error: 'Genre must be a string' };
    }
    
    const normalized = genre.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Check if it's a valid genre
    if (config.validGenres.includes(normalized)) {
        return { isValid: true, value: normalized };
    }
    
    return { isValid: false, error: `Invalid genre: ${genre}` };
}

/**
 * Validate cartoon type parameter
 * @param {string} type - The type to validate
 * @returns {object} - Validation result
 */
function validateCartoonType(type) {
    const defaultType = 'series';
    
    if (!type) {
        return { isValid: true, value: defaultType };
    }
    
    if (typeof type !== 'string') {
        return { isValid: true, value: defaultType };
    }
    
    const normalized = type.trim().toLowerCase();
    
    const validTypes = ['series', 'movies', 'shorts', 'specials', 'crossovers'];
    
    if (validTypes.includes(normalized)) {
        return { isValid: true, value: normalized };
    }
    
    return { isValid: true, value: defaultType };
}

/**
 * Sanitize string to prevent XSS
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\\/g, '&#x5C;')
        .replace(/`/g, '&#x60;')
        .trim();
}

/**
 * Validate episode ID format
 * @param {string} episodeId - The episode ID to validate
 * @returns {object} - Validation result
 */
function validateEpisodeId(episodeId) {
    if (!episodeId) {
        return { isValid: false, error: 'Episode ID is required' };
    }
    
    if (typeof episodeId !== 'string') {
        return { isValid: false, error: 'Episode ID must be a string' };
    }
    
    episodeId = episodeId.trim();
    
    // Expected format: anime-id-1x5 or similar
    const pattern = /^[a-zA-Z0-9\-]+-\d+x\d+$/;
    
    if (!pattern.test(episodeId)) {
        return { isValid: false, error: 'Invalid episode ID format. Expected format: anime-id-1x5' };
    }
    
    return { isValid: true, value: episodeId };
}

module.exports = {
    validateId,
    validatePage,
    validatePageSize,
    validateLetter,
    validateSearchQuery,
    validateEpisode,
    validateLanguage,
    validateGenre,
    validateCartoonType,
    sanitizeString,
    validateEpisodeId,
};
