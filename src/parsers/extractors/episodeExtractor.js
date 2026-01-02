/**
 * Episode Extractor - Extract episode lists from anime/movie/cartoon pages
 */

const BaseExtractor = require('./base');
const { parseEpisodeFormat, normalizeUrl, getPlayerName } = require('../utils/helpers');
const config = require('../config');

/**
 * Episode Extractor class for extracting episode lists
 */
class EpisodeExtractor extends BaseExtractor {
    /**
     * Extract episodes from anime ID
     * @param {string} id - Anime ID
     * @returns {object} - Extracted episodes
     */
    async extract(id) {
        const cacheKey = `episodes:${id}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const url = this.getContentUrl(id, 'series');
            const html = await this.fetchHTML(url);
            const $ = this.cheerio.load(html);

            const result = await this.extractEpisodes($, id);
            this.setCache(cacheKey, result, config.cache.episodes);
            return result;
        } catch (error) {
            console.error(`[Episode Extractor] Error extracting episodes for ${id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract episodes from Cheerio instance
     * @param {object} $ - Cheerio instance
     * @param {string} id - Content ID
     * @returns {object} - Extracted episodes
     */
    async extractEpisodes($, id) {
        try {
            const result = {
                success: true,
                id: id,
                url: this.getContentUrl(id, 'series'),
                title: '',
                totalEpisodes: 0,
                totalSeasons: 1,
                seasons: [],
                episodes: [],
            };

            // Extract title
            result.title = $('h1.entry-title, h1.title, .anime-title h1, .TPost .Title, h1').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') || '';

            // Detect content type
            const isMovie = result.url.includes('/movies/');
            const isCartoon = result.url.includes('/cartoon/');

            if (isMovie) {
                // Movie has single "episode"
                result.totalEpisodes = 1;
                result.episodes.push({
                    id: `${id}-1x1`,
                    number: 1,
                    season: 1,
                    title: 'Movie',
                    url: normalizeUrl(`${this.baseUrl}/watch/${id}-1x1`),
                    isSubOnly: false,
                    hasDub: true,
                    hasSub: true,
                });
                return result;
            }

            // Detect episodes separator for sub-only content
            const separatorFound = this.detectEpisodesSeparator($);

            // Extract episode list
            const episodeElements = $('a[href*="/episode/"], .episode-link a, .episodes-list a, [class*="episode"] a[href*="-1x"]');
            const episodeData = [];
            const seenEpisodes = new Set();

            episodeElements.each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();

                if (!href) return;

                // Extract season and episode number
                const seasonMatch = href.match(/-(\d+)x(\d+)/i);
                const epTextMatch = text.match(/EP[:\s]*(\d+)/i);

                let season = 1;
                let episode = null;

                if (seasonMatch) {
                    season = parseInt(seasonMatch[1]);
                    episode = parseInt(seasonMatch[2]);
                } else if (epTextMatch) {
                    episode = parseInt(epTextMatch[1]);
                } else {
                    const numMatch = text.match(/(\d+)/);
                    if (numMatch) {
                        episode = parseInt(numMatch[1]);
                    }
                }

                if (episode === null) return;

                const epId = `${id}-${season}x${episode}`;
                if (seenEpisodes.has(epId)) return;
                seenEpisodes.add(epId);

                // Check if this episode is in the sub-only section
                const isSubOnly = separatorFound && this.isEpisodeAfterSeparator($, el);

                // Determine availability based on position and page content
                const availability = this.detectEpisodeAvailability($, $(el), isSubOnly);

                episodeData.push({
                    id: epId,
                    number: episode,
                    season: season,
                    title: text || `Episode ${episode}`,
                    url: normalizeUrl(href),
                    isSubOnly: isSubOnly,
                    hasDub: !isSubOnly,
                    hasSub: true,
                    availability: availability,
                });
            });

            // If no episodes found with standard selectors, try alternative selectors
            if (episodeData.length === 0) {
                const altSelectors = [
                    '.post a[href*="-1x"]',
                    '.TPost a[href*="/episode/"]',
                    'article a[href*="-1x"]',
                ];

                for (const selector of altSelectors) {
                    $(selector).each((i, el) => {
                        const href = $(el).attr('href');
                        const text = $(el).text().trim();

                        if (!href) return;

                        const seasonMatch = href.match(/-(\d+)x(\d+)/i);
                        if (!seasonMatch) return;

                        const season = parseInt(seasonMatch[1]);
                        const episode = parseInt(seasonMatch[2]);
                        const epId = `${id}-${season}x${episode}`;

                        if (seenEpisodes.has(epId)) return;
                        seenEpisodes.add(epId);

                        episodeData.push({
                            id: epId,
                            number: episode,
                            season: season,
                            title: text || `Episode ${episode}`,
                            url: normalizeUrl(href),
                            isSubOnly: false,
                            hasDub: true,
                            hasSub: true,
                        });
                    });

                    if (episodeData.length > 0) break;
                }
            }

            // Group episodes by season
            const seasonsMap = new Map();
            episodeData.forEach(ep => {
                if (!seasonsMap.has(ep.season)) {
                    seasonsMap.set(ep.season, []);
                }
                seasonsMap.get(ep.season).push(ep);
            });

            // Build seasons array
            result.totalSeasons = seasonsMap.size;
            result.totalEpisodes = episodeData.length;

            seasonsMap.forEach((episodes, season) => {
                // Sort episodes by number
                episodes.sort((a, b) => a.number - b.number);

                result.seasons.push({
                    season: season,
                    episodeCount: episodes.length,
                    startEpisode: episodes[0]?.number || 1,
                    endEpisode: episodes[episodes.length - 1]?.number || episodes.length,
                });

                // Add episodes to main list
                result.episodes.push(...episodes);
            });

            // Sort episodes by season and number
            result.episodes.sort((a, b) => {
                if (a.season !== b.season) return a.season - b.season;
                return a.number - b.number;
            });

            // Add separator info to result
            result.separatorFound = separatorFound;
            result.subOnlyEpisodes = episodeData.filter(ep => ep.isSubOnly).length;

            return result;
        } catch (error) {
            console.error('[Episode Extractor] Error in extractEpisodes:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect if there's an episodes separator element
     * @param {object} $ - Cheerio instance
     * @returns {boolean} - Whether separator was found
     */
    detectEpisodesSeparator($) {
        // Look for the separator element mentioned in requirements
        const separator = $('.episodes-separator, [class*="episodes-separator"], .sub-dub-separator, [class*="sub-separator"]');
        return separator.length > 0;
    }

    /**
     * Check if an episode element is after the separator
     * @param {object} $ - Cheerio instance
     * @param {object} el - Episode element
     * @returns {boolean} - Whether episode is after separator
     */
    isEpisodeAfterSeparator($, el) {
        const separator = $('.episodes-separator, [class*="episodes-separator"], .sub-dub-separator').first();

        if (separator.length === 0) {
            return false;
        }

        // Compare positions in DOM
        const separatorIndex = this.getElementIndex(separator);
        const episodeIndex = this.getElementIndex($(el));

        return episodeIndex > separatorIndex;
    }

    /**
     * Get the index of an element among its siblings
     * @param {object} $el - Cheerio element
     * @returns {number} - Index
     */
    getElementIndex($el) {
        let index = 0;
        $el.prevAll().each(() => index++);
        return index;
    }

    /**
     * Detect episode availability
     * @param {object} $ - Cheerio instance
     * @param {object} $el - Episode element
     * @param {boolean} isSubOnly - Whether episode is sub-only
     * @returns {object} - Availability object
     */
    detectEpisodeAvailability($, $el, isSubOnly) {
        const availability = {
            hasSub: true,
            hasDub: !isSubOnly,
            isSubOnly: isSubOnly,
            notes: [],
        };

        // Check for dub/sub indicators in episode text or nearby elements
        const epText = $el.text().toLowerCase();

        if (epText.includes('dub') || epText.includes('english')) {
            availability.hasDub = true;
        }

        if (epText.includes('sub') || epText.includes('raw')) {
            availability.hasSub = true;
        }

        // Check for language indicators in parent elements
        const parentText = $el.parent().text().toLowerCase();
        if (parentText.includes('sub only') || parentText.includes('sub only')) {
            availability.isSubOnly = true;
            availability.hasDub = false;
            availability.notes.push('Subtitles only');
        }

        return availability;
    }

    /**
     * Fetch HTML (override to add caching)
     */
    async fetchHTML(url) {
        const { fetchHTML: fetchHTMLUtil } = require('../utils/request');
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

    /**
     * Get Cheerio (override)
     */
    cheerio = {
        load: require('cheerio')
    };
}

module.exports = EpisodeExtractor;
