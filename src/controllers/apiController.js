/**
 * API Controller - Main controller for API endpoints
 * Updated with standardized error handling, validation, and HomeParser integration
 */

const { AnimeParser, CartoonParser, MoviesParser, HomeParser } = require('../parsers');
const { fetchHTML } = require('../utils/request');
const config = require('../../config/config');
const validator = require('../utils/validator');

/**
 * API Controller class with improved architecture
 */
class ApiController {
    constructor() {
        this.animeParser = new AnimeParser();
        this.cartoonParser = new CartoonParser();
        this.moviesParser = new MoviesParser();
        this.homeParser = new HomeParser();
        this.cache = new Map();
        this.cacheStats = { hits: 0, misses: 0 };
    }

    /**
     * Get from cache with stats tracking
     */
    getFromCache(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < item.ttl) {
            this.cacheStats.hits++;
            return item.data;
        }
        this.cacheStats.misses++;
        return null;
    }

    /**
     * Set cache with size limits
     */
    setCache(key, data, ttl = config.cache.ttl) {
        // Enforce cache size limit
        if (this.cache.size >= config.cache.maxSize) {
            // Remove oldest entry
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: config.cache.maxSize,
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 
                ? ((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100).toFixed(2) + '%' 
                : '0%',
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheStats = { hits: 0, misses: 0 };
    }

    /**
     * Get home page data using HomeParser
     */
    async getHome() {
        const cacheKey = 'home';
        const cached = this.getFromCache(cacheKey);
        
        // If we have cached data, add cache metadata
        if (cached) {
            const cacheTimestamp = cached._cacheTimestamp || Date.now();
            const age = Date.now() - cacheTimestamp;
            const hoursOld = Math.floor(age / 3600000);
            const isStale = hoursOld >= 1; // Consider stale after 1 hour
            
            // Add cache metadata to response
            cached.meta = cached.meta || {};
            cached.meta.cache = {
                timestamp: new Date(cacheTimestamp).toISOString(),
                age: `${hoursOld}h`,
                isStale: isStale,
                isCached: true
            };
            
            // Add warning if stale
            if (isStale) {
                cached.meta.cache.warning = 'This data is over 1 hour old. The source website may be unavailable.';
                cached.meta.cache.stale = true;
            }
            
            return cached;
        }

        try {
            // Vercel has 10s timeout, use 9s for safety
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 9000);
            });

            const extractPromise = this.homeParser.extract();
            const result = await Promise.race([extractPromise, timeoutPromise]);

            if (result.success) {
                // Add cache timestamp
                result._cacheTimestamp = Date.now();
                
                this.setCache(cacheKey, result, config.cache.ttl);
                
                // Add fresh cache metadata
                result.meta = result.meta || {};
                result.meta.cache = {
                    timestamp: new Date().toISOString(),
                    age: '0h',
                    isStale: false,
                    isCached: false,
                    isFresh: true
                };
                
                return result;
            }

            return {
                success: false,
                error: result.error || 'Failed to fetch home page data',
            };
        } catch (error) {
            console.error('[Controller] Error getting home:', error.message);

            // Return a more informative error with stale fallback
            if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('fetch')) {
                return {
                    success: false,
                    statusCode: 503,
                    errorCode: 'SCRAPING_ERROR',
                    error: 'Unable to fetch data from source. Please try again later.',
                    message: 'The source website may be slow or unavailable. This is usually temporary.',
                    meta: {
                        cache: {
                            timestamp: null,
                            age: null,
                            isStale: false,
                            isCached: false,
                            error: true
                        }
                    }
                };
            }

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get anime info with validation
     */
    async getInfo(id) {
        // Validate ID
        const validation = validator.validateId(id);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        return this.animeParser.getInfo(id);
    }

    /**
     * Get anime episodes with validation
     */
    async getEpisodes(id) {
        // Validate ID
        const validation = validator.validateId(id);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        return this.animeParser.getEpisodes(id);
    }

    /**
     * Get stream links with validation
     */
    async getStream(episodeId, lang = 'hindi') {
        // Validate episode ID
        const epValidation = validator.validateEpisodeId(episodeId);
        if (!epValidation.isValid) {
            return { success: false, error: epValidation.error };
        }

        // Validate language
        const langValidation = validator.validateLanguage(lang);
        if (!langValidation.isValid) {
            return { success: false, error: langValidation.error };
        }

        return this.animeParser.getStream(episodeId, langValidation.value);
    }

    /**
     * Get movies list with validation
     */
    async getMovies(page = 1, pageSize = 20) {
        // Validate pagination
        const pageValidation = validator.validatePage(page);
        const sizeValidation = validator.validatePageSize(pageSize);
        
        return this.moviesParser.getMovies(pageValidation.value, sizeValidation.value);
    }

    /**
     * Get movie info with validation
     */
    async getMovieInfo(id) {
        // Validate ID
        const validation = validator.validateId(id);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        return this.moviesParser.getInfo(id);
    }

    /**
     * Get cartoons with validation
     */
    async getCartoons(type = 'series', subCategory = null, page = 1) {
        // Validate type
        const typeValidation = validator.validateCartoonType(type);
        // Validate pagination
        const pageValidation = validator.validatePage(page);

        return this.cartoonParser.extractCartoons(
            typeValidation.value,
            subCategory,
            pageValidation.value
        );
    }

    /**
     * Search anime with validation and sanitization
     */
    async search(query, page = 1, pageSize = 20) {
        // Validate and sanitize query
        const queryValidation = validator.validateSearchQuery(query);
        if (!queryValidation.isValid) {
            return { success: false, error: queryValidation.error };
        }

        // Validate pagination
        const pageValidation = validator.validatePage(page);
        const sizeValidation = validator.validatePageSize(pageSize);

        try {
            const searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(queryValidation.value)}`;
            const html = await fetchHTML(searchUrl);
            const $ = require('cheerio').load(html);

            const results = [];
            const seenIds = new Set();

            $('article.post:has(a[href*="/series/"]), article.post:has(a[href*="/movies/"])').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    results.push(item);
                }
            });

            // Pagination
            const startIndex = (pageValidation.value - 1) * sizeValidation.value;
            const paginatedResults = results.slice(startIndex, startIndex + sizeValidation.value);

            return {
                success: true,
                query: queryValidation.value,
                total: results.length,
                page: pageValidation.value,
                pageSize: sizeValidation.value,
                totalPages: Math.ceil(results.length / sizeValidation.value),
                results: paginatedResults,
            };
        } catch (error) {
            console.error('[Controller] Error searching:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get genre anime with validation
     */
    async getGenre(genre, page = 1, pageSize = 20) {
        // Validate genre
        const genreValidation = validator.validateGenre(genre);
        if (!genreValidation.isValid) {
            return { success: false, error: genreValidation.error };
        }

        // Validate pagination
        const pageValidation = validator.validatePage(page);
        const sizeValidation = validator.validatePageSize(pageSize);

        try {
            const url = `${config.baseUrl}/category/genre/${genreValidation.value}${pageValidation.value > 1 ? `/page/${pageValidation.value}` : ''}`;
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const items = [];
            const seenIds = new Set();

            $('article.post, li.post').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    items.push(item);
                }
            });

            return {
                success: true,
                genre: genreValidation.value,
                page: pageValidation.value,
                pageSize: sizeValidation.value,
                total: items.length,
                items: items,
            };
        } catch (error) {
            console.error('[Controller] Error getting genre:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get anime by letter with validation
     */
    async getLetterContent(letter, page = 1, pageSize = 20) {
        // Validate letter
        const letterValidation = validator.validateLetter(letter);
        if (!letterValidation.isValid) {
            return { success: false, error: letterValidation.error };
        }

        // Validate pagination
        const pageValidation = validator.validatePage(page);
        const sizeValidation = validator.validatePageSize(pageSize);

        try {
            // Try letter-based URL pattern
            const letterUrls = [
                `${config.baseUrl}/letter/${letterValidation.value.toLowerCase()}`,
                `${config.baseUrl}/?letter=${letterValidation.value}`,
                `${config.baseUrl}/anime-list/${letterValidation.value.toLowerCase()}`,
            ];

            let items = [];
            let foundContent = false;

            for (const url of letterUrls) {
                try {
                    const html = await fetchHTML(url);
                    const $ = require('cheerio').load(html);

                    const pageItems = [];
                    const seenIds = new Set();

                    $('article.post, li.post, .post-item, .anime-item').each((i, el) => {
                        const item = this.parseAnimeItem($, $(el));
                        if (item && item.id && !seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            pageItems.push(item);
                        }
                    });

                    if (pageItems.length > 0) {
                        items = pageItems;
                        foundContent = true;
                        break;
                    }
                } catch (e) {
                    // Try next URL pattern
                    continue;
                }
            }

            // If no content found from letter URLs, filter from home data
            if (!foundContent) {
                const home = await this.getHome();
                if (home.success && home.animeList) {
                    const letterValue = letterValidation.value;
                    items = home.animeList.filter(item => {
                        const firstChar = item.title.charAt(0).toUpperCase();
                        if (letterValue === '#') {
                            return !/^[A-Z]$/i.test(firstChar);
                        }
                        return firstChar === letterValue;
                    });
                }
            }

            // Pagination
            const startIndex = (pageValidation.value - 1) * sizeValidation.value;
            const paginatedItems = items.slice(startIndex, startIndex + sizeValidation.value);

            return {
                success: true,
                letter: letterValidation.value,
                page: pageValidation.value,
                pageSize: sizeValidation.value,
                total: items.length,
                totalPages: Math.ceil(items.length / sizeValidation.value),
                items: paginatedItems,
            };
        } catch (error) {
            console.error('[Controller] Error getting letter content:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get random anime
     */
    async getRandom() {
        const home = await this.getHome();
        if (home.success && home.trending && home.trending.length > 0) {
            const randomIndex = Math.floor(Math.random() * home.trending.length);
            const item = home.trending[randomIndex];
            return {
                success: true,
                anime: item,
            };
        }
        return { success: false, error: 'No anime found' };
    }

    // Helper methods
    normalizeUrl(url) {
        if (!url) return null;
        if (typeof url !== 'string') return null;
        url = url.trim();
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return config.baseUrl + url;
        if (!url.startsWith('http') && url.includes('animesalt.cc')) return 'https://' + url;
        return url;
    }

    getGenreIcon(genreId) {
        return config.genreIcons[genreId?.toLowerCase()] || '🎬';
    }

    parseAnimeItem($, $el) {
        const link = $el.find('a.lnk-blk').attr('href') ||
            $el.find('a[href*="/series/"]').attr('href') ||
            $el.find('a[href*="/movies/"]').attr('href') ||
            $el.find('a[href*="/cartoon/"]').attr('href') ||
            $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract and sanitize title
        let title = $el.find('img').attr('alt')?.replace(/^Image\s*/i, '').trim() ||
            $el.find('.Title, .entry-title, .title').text().trim() ||
            $el.clone().children().remove().end().text().trim().substring(0, 100);

        if (!title) return null;

        // Sanitize title to prevent XSS
        title = validator.sanitizeString(title);

        const poster = $el.find('img').attr('data-src') ||
            $el.find('img').attr('src') ||
            $el.find('img').attr('data-lazy-src');

        const epMatch = $el.text().match(/EP[:\s]*(\d+)/i);
        const isCartoon = title.toLowerCase().includes('cartoon') || link.includes('/cartoon/');

        let subCategory = 'TV Series';
        const pageText = $el.text().toLowerCase();
        if (title.toLowerCase().includes('movie') || link.includes('/movies/')) {
            subCategory = 'Movie';
        } else if (pageText.includes('ova') || pageText.includes('OAD')) {
            subCategory = 'OVA/Special';
        }

        const { extractIdFromUrl } = require('../utils/helpers');
        return {
            id: extractIdFromUrl(link),
            title: title,
            poster: this.normalizeUrl(poster),
            url: this.normalizeUrl(link),
            latestEpisode: epMatch ? epMatch[1] : null,
            type: link.includes('/movies/') ? 'MOVIE' : (isCartoon ? 'CARTOON' : 'SERIES'),
            subCategory: subCategory,
        };
    }
}

module.exports = ApiController;
