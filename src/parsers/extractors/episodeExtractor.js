/**
 * Episode Extractor - Extract episode lists from anime/movie/cartoon pages
 */

const BaseExtractor = require('./base');
const { parseEpisodeFormat, normalizeUrl, getPlayerName } = require('../../utils/helpers');
const config = require('../../config');

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
                availableEpisodes: 0,
                totalSeasons: 0,
                availableSeasons: 0,
                seasons: [],
                episodes: [],
                related_data: [],
                separatorFound: false,
            };

            // Extract title
            result.title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';

            // Detect content type
            const isMovie = result.url.includes('/movies/');
            const isCartoon = result.url.includes('/cartoon/');

            if (isMovie) {
                // Movie has single "episode"
                result.totalEpisodes = 1;
                result.availableEpisodes = 1;
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

            // Get page text for season parsing
            const pageText = $('body').text();

            // Parse seasons from page text and filter out sub-only seasons
            // Uses comprehensive patterns from config for thorough filtering
            const seasonsMap = new Map();
            const seasonMatches = pageText.matchAll(/Season\s*(\d+)[^•]*•\s*(\d+)[^)]*\((\d+)\)\s*([^(\n]*)/g);
            
            for (const match of seasonMatches) {
                const seasonNum = parseInt(match[1]);
                const startEp = parseInt(match[2]);
                const epCount = parseInt(match[3]);
                const seasonText = match[4] || '';
                
                // Check if this season is sub-only using comprehensive patterns from config
                const isSubOnly = config.subOnlyPatterns.some(pattern => pattern.test(seasonText));
                
                // Only include dubbed seasons (not sub-only)
                if (!isSubOnly) {
                    seasonsMap.set(seasonNum, {
                        season: seasonNum,
                        startEpisode: startEp,
                        episodeCount: epCount,
                        isSubOnly: false,
                    });
                }
            }

            // Extract episode data - STOP at separator
            const episodeData = [];
            const seenEpisodes = new Set();
            let separatorFound = false;

            // Iterate through all li elements to find episodes
            $('li').each((i, el) => {
                if (separatorFound) return; // Stop processing after separator
                
                const $el = $(el);
                
                // Check if this is the separator or contains the separator
                if ($el.find('.episodes-separator').length > 0 || 
                    $el.hasClass('episodes-separator') ||
                    $el.text().includes("Below episodes aren't dubbed in regional languages") ||
                    $el.text().includes("Below episodes aren't dubbed")) {
                    separatorFound = true;
                    return; // Stop processing episodes
                }
                
                const text = $el.text();
                
                // Look for episodes in the episode list section
                const h2 = $el.find('h2');
                if (h2.length === 0) return;
                
                const title = h2.text().trim();
                if (!title || title.length < 2) return;
                
                // Find the View link (which contains the episode URL)
                const viewLink = $el.find('a:contains("View")').attr('href') || 
                                $el.find('a').attr('href');
                
                if (!viewLink || !viewLink.includes('/episode/')) return;
                
                // Extract season and episode number from URL
                const seasonMatch = viewLink.match(/-(\d+)x(\d+)/i);
                if (!seasonMatch) return;
                
                const season = parseInt(seasonMatch[1]);
                const episode = parseInt(seasonMatch[2]);
                
                // Skip if this season is sub-only
                if (seasonsMap.has(season) && seasonsMap.get(season).isSubOnly) return;
                
                const epId = `${id}-${season}x${episode}`;
                if (seenEpisodes.has(epId)) return;
                seenEpisodes.add(epId);
                
                // Get thumbnail if available
                const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';

                episodeData.push({
                    id: epId,
                    number: episode,
                    season: season,
                    title: title,
                    url: normalizeUrl(viewLink),
                    thumbnail: normalizeUrl(thumbnail),
                    isSubOnly: false,
                    hasDub: true,
                    hasSub: true,
                    isGrayedOut: false,
                });
            });

            // If no episodes found, try finding direct episode links (before separator)
            if (episodeData.length === 0) {
                $('a[href*="/episode/"]').each((i, el) => {
                    if (separatorFound) return false; // Stop at separator
                    
                    const href = $(el).attr('href');
                    if (!href) return;
                    
                    // Check if we've hit the separator
                    const $el = $(el);
                    if ($el.closest('.episodes-separator').length > 0 ||
                        $el.parents().text().includes("Below episodes aren't dubbed")) {
                        separatorFound = true;
                        return false;
                    }
                    
                    const seasonMatch = href.match(/-(\d+)x(\d+)/i);
                    if (!seasonMatch) return;
                    
                    const season = parseInt(seasonMatch[1]);
                    const episode = parseInt(seasonMatch[2]);
                    
                    // Skip if this season is sub-only
                    if (seasonsMap.has(season) && seasonsMap.get(season).isSubOnly) return;
                    
                    const epId = `${id}-${season}x${episode}`;
                    if (seenEpisodes.has(epId)) return;
                    seenEpisodes.add(epId);
                    
                    // Find title from nearby elements
                    const title = $el.find('h2').text().trim() || 
                                 $el.closest('li').find('h2').text().trim() ||
                                 $el.closest('article').find('h2').text().trim() ||
                                 `Episode ${episode}`;
                    
                    episodeData.push({
                        id: epId,
                        number: episode,
                        season: season,
                        title: title,
                        url: normalizeUrl(href),
                        isSubOnly: false,
                        hasDub: true,
                        hasSub: true,
                        isGrayedOut: false,
                    });
                });
            }

            // Group episodes by season
            const organizedSeasons = new Map();
            episodeData.forEach(ep => {
                if (!organizedSeasons.has(ep.season)) {
                    organizedSeasons.set(ep.season, []);
                }
                organizedSeasons.get(ep.season).push(ep);
            });

            // Build seasons array with only dubbed seasons
            result.availableSeasons = organizedSeasons.size;
            result.availableEpisodes = episodeData.length;
            result.separatorFound = separatorFound;
            result.separatorAvailable = separatorFound;

            organizedSeasons.forEach((episodes, season) => {
                // Sort episodes by number
                episodes.sort((a, b) => a.number - b.number);

                // Get episode range from page text if available
                let startEp = episodes[0]?.number || 1;
                let epCount = episodes.length;
                
                // Use season info from page text if available (only for dubbed seasons)
                if (seasonsMap.has(season)) {
                    startEp = seasonsMap.get(season).startEpisode;
                    epCount = seasonsMap.get(season).episodeCount;
                }

                result.seasons.push({
                    season: season,
                    title: `Season ${season}`,
                    episodeCount: epCount,
                    startEpisode: startEp,
                    endEpisode: startEp + epCount - 1,
                    episodeRange: `${startEp}-${startEp + epCount - 1}`,
                    isSubOnly: false,
                });

                // Add episodes to main list
                result.episodes.push(...episodes);
            });

            // Calculate total from page text (for reference - includes sub-only content)
            const totalEpMatch = pageText.match(/(\d+)\s*Episodes/i);
            result.totalEpisodes = totalEpMatch ? parseInt(totalEpMatch[1]) : result.availableEpisodes;
            
            const totalSeasonsMatch = pageText.match(/(\d+)\s*Seasons/i);
            result.totalSeasons = totalSeasonsMatch ? parseInt(totalSeasonsMatch[1]) : result.availableSeasons;

            // Sort episodes by season and number
            result.episodes.sort((a, b) => {
                if (a.season !== b.season) return a.season - b.season;
                return a.number - b.number;
            });

            // Add related_data field (same as episodes for compatibility)
            result.related_data = result.episodes;

            return result;
        } catch (error) {
            console.error('[Episode Extractor] Error in extractEpisodes:', error.message);
            return { success: false, error: error.message };
        }
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
