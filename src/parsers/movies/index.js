/**
 * Movies Parser - Parser for movie content
 */

const BaseExtractor = require('../extractors/base');
const InfoExtractor = require('../extractors/infoExtractor');
const StreamExtractor = require('../extractors/streamExtractor');
const { normalizeUrl, parseReleaseYear } = require('../utils/helpers');
const config = require('../../config');

/**
 * Movies Parser for handling movie content
 */
class MoviesParser extends BaseExtractor {
    constructor() {
        super(config.baseUrl);
        this.infoExtractor = new InfoExtractor();
        this.streamExtractor = new StreamExtractor();
    }

    /**
     * Get movies list with pagination
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {object} - Movies data
     */
    async getMovies(page = 1, pageSize = 20) {
        const cacheKey = `movies:${page}:${pageSize}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const url = `${this.baseUrl}/movies/${page > 1 ? `page/${page}` : ''}`;
            const html = await this.fetchHTML(url);
            const $ = this.cheerio.load(html);

            const result = await this.extractMovies($, page, pageSize);
            this.setCache(cacheKey, result, config.cache.movies);
            return result;
        } catch (error) {
            console.error(`[Movies Parser] Error extracting movies:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract movies from page
     * @param {object} $ - Cheerio instance
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {object} - Movies data
     */
    async extractMovies($, page = 1, pageSize = 20) {
        const result = {
            success: true,
            page: page,
            pageSize: pageSize,
            totalMovies: 0,
            totalPages: 0,
            movies: [],
        };

        const seenIds = new Set();
        const movieSelectors = [
            '.movies-list .movie-item',
            '.movies-list li',
            '.movie-list .movie',
            '.movie-item',
            '.movies-grid .movie',
            'ul.movies-list > li',
            'div.movies-list > li',
            '.TPost.movies',
            'article.post-movie',
            '.post-movie',
            'article:has(a[href*="/movies/"])',
            '.post:has(a[href*="/movies/"])',
            'a[href*="/movies/"]',
        ];

        for (const selector of movieSelectors) {
            if (seenIds.size >= pageSize) break;

            $(selector).each((i, el) => {
                if (seenIds.size >= pageSize) return;

                const $el = $(el);
                const link = $el.find('a[href*="/movies/"]').attr('href') ||
                    $el.attr('href') ||
                    $el.find('a').attr('href');

                if (!link) return;

                const { extractIdFromUrl } = require('../utils/helpers');
                const id = extractIdFromUrl(link);

                if (!id || seenIds.has(id)) return;
                seenIds.add(id);

                const title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim() ||
                    $el.find('.title, .entry-title').text().trim() ||
                    $el.text().substring(0, 100).trim();

                const poster = $el.find('img').attr('data-src') ||
                    $el.find('img').attr('src') ||
                    $el.find('img').attr('data-lazy-src');

                if (title && title.length > 2) {
                    result.movies.push({
                        id: id,
                        title: title,
                        poster: normalizeUrl(poster),
                        url: normalizeUrl(link),
                        type: 'MOVIE',
                    });
                }
            });

            if (result.movies.length > 0) break;
        }

        // Fallback: Direct link search
        if (result.movies.length === 0) {
            $('a[href*="/movies/"]').each((i, el) => {
                if (i >= pageSize) return;

                const href = $(el).attr('href');
                if (!href) return;

                const { extractIdFromUrl } = require('../utils/helpers');
                const id = extractIdFromUrl(href);

                if (!id || seenIds.has(id)) return;
                seenIds.add(id);

                const $parent = $(el).closest('article, li, div');
                const title = $(el).find('img').attr('alt')?.replace(/^Image /, '').trim() ||
                    $parent.find('.title, .entry-title').text().trim() ||
                    $(el).text().trim();

                const poster = $(el).find('img').attr('data-src') ||
                    $(el).find('img').attr('src');

                if (title && title.length > 2) {
                    result.movies.push({
                        id: id,
                        title: title,
                        poster: normalizeUrl(poster),
                        url: normalizeUrl(href),
                        type: 'MOVIE',
                    });
                }
            });
        }

        result.totalMovies = result.movies.length;
        result.totalPages = Math.ceil(result.movies.length / pageSize) || 1;

        return result;
    }

    /**
     * Get info for a movie
     * @param {string} id - Movie ID
     * @returns {object} - Movie info
     */
    async getInfo(id) {
        return this.infoExtractor.extract(id);
    }

    /**
     * Get stream links for a movie
     * @param {string} movieId - Movie ID
     * @returns {object} - Stream data
     */
    async getStream(movieId) {
        const episodeId = `${movieId}-1x1`;
        return this.streamExtractor.extract(episodeId);
    }

    /**
     * Get complete movie data
     * @param {string} id - Movie ID
     * @returns {object} - Complete movie data
     */
    async getComplete(id) {
        const [info, stream] = await Promise.all([
            this.getInfo(id),
            this.getStream(id),
        ]);

        return {
            success: true,
            id: id,
            info: info,
            stream: stream,
        };
    }

    /**
     * Fetch HTML (override)
     */
    async fetchHTML(url) {
        const { fetchHTML: fetchHTMLUtil } = require('../../utils/request');
        return fetchHTMLUtil(url);
    }

    /**
     * Get from cache
     */
    getFromCache(key) {
        return null;
    }

    /**
     * Set cache
     */
    setCache(key, data, ttl) {
    }
}

module.exports = MoviesParser;
