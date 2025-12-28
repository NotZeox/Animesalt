/**
 * Episode Extractor for Anime Salt API
 * Extracts episode lists with proper numbering and metadata
 */

const { fetchHTML, extractIdFromUrl, extractEpisodeFromUrl, sanitizeText, normalizeUrl } = require('../utils/helpers');

class EpisodeExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract all episodes for an anime
     */
    async extract(id, options = {}) {
        try {
            const url = this.buildUrl(id);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const episodes = this.parseEpisodes($);
            const totalEpisodes = episodes.length;

            return {
                success: true,
                data: {
                    totalEpisodes,
                    episodes: episodes.reverse(), // Order: 1, 2, 3... (oldest first)
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build URL from anime ID
     */
    buildUrl(id) {
        if (id.startsWith('series/')) {
            return `${this.baseUrl}/${id}/`;
        } else if (id.includes('/')) {
            return `${this.baseUrl}/${id}/`;
        }
        return `${this.baseUrl}/series/${id}/`;
    }

    /**
     * Parse episodes from page
     */
    parseEpisodes($) {
        const episodes = [];
        let episodeNum = 1;

        // Try different selectors for episode links
        const selectors = [
            'article.post a[href*="/episode/"]',
            '.episodes a[href*="/episode/"]',
            '.episode-list a[href*="/episode/"]',
            'a[href*="/episode/"]',
        ];

        for (const selector of selectors) {
            const found = this.parseBySelector($, selector, episodes, episodeNum);
            if (found.length > 0) {
                return found;
            }
        }

        return episodes;
    }

    /**
     * Parse episodes using specific selector
     */
    parseBySelector($, selector, episodes, startNum) {
        const foundEpisodes = [];

        $(selector).each((i, el) => {
            const link = $(el).attr('href');
            
            if (!link || !link.includes('/episode/')) return;

            // Extract episode number from URL
            const epData = extractEpisodeFromUrl(link);
            
            if (epData) {
                const title = $(el).find('.entry-title').text().trim() || 
                              $(el).attr('title') || 
                              $(el).text().trim();
                
                const posterEl = $(el).closest('article').find('.post-thumbnail img');
                const poster = this.extractPoster(posterEl);

                foundEpisodes.push({
                    episode_no: epData.episode,
                    id: epData.formatted,
                    data_id: this.generateDataId(link),
                    title: sanitizeText(title),
                    link: normalizeUrl(link),
                    poster: poster,
                    japanese_title: '',
                });
            }
        });

        // Remove duplicates and sort
        const unique = foundEpisodes.filter((ep, index, self) =>
            index === self.findIndex(e => e.id === ep.id)
        );

        return unique.sort((a, b) => a.episode_no - b.episode_no);
    }

    /**
     * Extract poster from episode element
     */
    extractPoster(element) {
        if (!element || element.length === 0) return null;
        
        const dataSrc = element.attr('data-src') || element.attr('src');
        if (dataSrc) {
            if (dataSrc.startsWith('//')) {
                return 'https:' + dataSrc;
            }
            return dataSrc;
        }
        
        return null;
    }

    /**
     * Generate numeric data ID from string
     */
    generateDataId(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Extract episodes with pagination support
     */
    async extractWithPagination(id, page = 1, pageSize = 50) {
        try {
            const url = this.buildUrl(id);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const allEpisodes = this.parseEpisodes($);
            
            // Paginate results
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const paginatedEpisodes = allEpisodes.slice(start, end);

            return {
                success: true,
                data: {
                    totalEpisodes: allEpisodes.length,
                    currentPage: page,
                    totalPages: Math.ceil(allEpisodes.length / pageSize),
                    episodes: paginatedEpisodes,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Pagination Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get episode range
     */
    async extractRange(id, startEp, endEp) {
        try {
            const result = await this.extract(id);
            
            if (!result.success) {
                return result;
            }

            const filteredEpisodes = result.data.episodes.filter(ep => 
                ep.episode_no >= startEp && ep.episode_no <= endEp
            );

            return {
                success: true,
                data: {
                    totalEpisodes: filteredEpisodes.length,
                    episodes: filteredEpisodes,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Range Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = EpisodeExtractor;
