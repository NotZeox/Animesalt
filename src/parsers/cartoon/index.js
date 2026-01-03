/**
 * Cartoon Parser - Parser for cartoon content
 */

const BaseExtractor = require('../extractors/base');
const InfoExtractor = require('../extractors/infoExtractor');
const EpisodeExtractor = require('../extractors/episodeExtractor');
const StreamExtractor = require('../extractors/streamExtractor');
const config = require('../../config');

/**
 * Cartoon Parser for handling cartoon content
 */
class CartoonParser extends BaseExtractor {
    constructor() {
        super(config.baseUrl);
        this.infoExtractor = new InfoExtractor();
        this.episodeExtractor = new EpisodeExtractor();
        this.streamExtractor = new StreamExtractor();
    }

    /**
     * Get content URL for cartoon
     * @param {string} id - Cartoon ID
     * @param {string} type - Content type (series/movies)
     * @returns {string} - Full URL
     */
    getContentUrl(id, type = 'series') {
        const typeMap = {
            'series': 'series',
            'movie': 'movies',
            'movies': 'movies',
        };
        const contentType = typeMap[type.toLowerCase()] || 'series';
        return `${this.baseUrl}/cartoon/${contentType}/${id}`;
    }

    /**
     * Get info for a cartoon
     * @param {string} id - Cartoon ID
     * @returns {object} - Cartoon info
     */
    async getInfo(id) {
        return this.infoExtractor.extract(id);
    }

    /**
     * Get episodes for a cartoon
     * @param {string} id - Cartoon ID
     * @returns {object} - Episodes data
     */
    async getEpisodes(id) {
        return this.episodeExtractor.extract(id);
    }

    /**
     * Get stream links for a cartoon episode
     * @param {string} episodeId - Episode ID
     * @returns {object} - Stream data
     */
    async getStream(episodeId) {
        return this.streamExtractor.extract(episodeId);
    }

    /**
     * Extract cartoons from page
     * @param {string} type - Type (series/movies)
     * @param {string} subCategory - Sub-category filter
     * @param {number} page - Page number
     * @returns {object} - Cartoons data
     */
    async extractCartoons(type = 'series', subCategory = null, page = 1) {
        try {
            const url = `${this.baseUrl}/cartoon/${type}${page > 1 ? `/page/${page}` : ''}`;
            const html = await this.fetchHTML(url);
            const $ = this.cheerio.load(html);

            const result = {
                success: true,
                type: type,
                subCategory: subCategory,
                page: page,
                cartoons: [],
            };

            const seenIds = new Set();

            // Extract cartoon items
            $('article.post, li.post, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));

                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);

                    // Filter by sub-category if specified
                    if (subCategory && item.subCategory !== subCategory) {
                        return;
                    }

                    result.cartoons.push(item);
                }
            });

            return result;
        } catch (error) {
            console.error(`[Cartoon Parser] Error extracting cartoons:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get complete cartoon data
     * @param {string} id - Cartoon ID
     * @returns {object} - Complete cartoon data
     */
    async getComplete(id) {
        const [info, episodes] = await Promise.all([
            this.getInfo(id),
            this.getEpisodes(id),
        ]);

        return {
            success: true,
            id: id,
            info: info,
            episodes: episodes,
        };
    }

    /**
     * Fetch HTML (override)
     */
    async fetchHTML(url) {
        const { fetchHTML: fetchHTMLUtil } = require('../../utils/request');
        return fetchHTMLUtil(url);
    }
}

module.exports = CartoonParser;
