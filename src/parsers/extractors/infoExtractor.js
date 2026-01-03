/**
 * Info Extractor - Extract detailed information from anime/movie/cartoon pages
 */

const BaseExtractor = require('./base');
const { normalizeUrl, getGenreIcon, cleanText } = require('../../utils/helpers');
const config = require('../../config');

/**
 * Info Extractor class for extracting anime/movie details
 */
class InfoExtractor extends BaseExtractor {
    /**
     * Extract info from anime ID
     * @param {string} id - Anime ID
     * @returns {object} - Extracted info
     */
    async extract(id) {
        const cacheKey = `info:${id}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const url = this.getContentUrl(id, 'series');
            const html = await this.fetchHTML(url);
            const $ = this.cheerio.load(html);

            const result = await this.extractInfo($, id);
            this.setCache(cacheKey, result, config.cache.info);
            return result;
        } catch (error) {
            console.error(`[Info Extractor] Error extracting info for ${id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract info from Cheerio instance
     * @param {object} $ - Cheerio instance
     * @param {string} id - Content ID
     * @returns {object} - Extracted info
     */
    async extractInfo($, id) {
        try {
            const result = {
                success: true,
                id: id,
                url: this.getContentUrl(id, 'series'),
                title: '',
                synopsis: '',
                poster: '',
                backgroundImage: '',
                type: 'SERIES',
                subCategory: 'TV Series',
                status: 'Completed',
                releaseDate: '',
                releaseYear: '',
                duration: '',
                quality: 'HD',
                genres: [],
                languages: [],
                availability: null,
                downloadLinks: [],
                networks: [],
                relatedAnime: [],
                otherNames: [],
                totalEpisodes: 0,
                seasons: [],
            };

            // Extract title - simple h1 at the top
            result.title = $('h1').first().text().trim() || '';
            if (!result.title) {
                result.title = $('meta[property="og:title"]').attr('content') || '';
            }

            // Extract poster - img at the top of the page
            const poster = $('img').first().attr('src') || $('img').first().attr('data-src') || '';
            result.poster = normalizeUrl(poster) || $('meta[property="og:image"]').attr('content') || '';

            // Extract background image from TPostBg element
            result.backgroundImage = $('#w_content .TPostBg').attr('src') || '';

            // Extract type from URL
            if (result.url.includes('/movies/')) {
                result.type = 'MOVIE';
                result.subCategory = 'Movie';
            } else if (result.url.includes('/cartoon/')) {
                result.type = 'CARTOON';
                result.subCategory = 'Series';
            }

            // Extract synopsis from paragraphs - the page has synopsis in paragraph elements
            let synopsis = '';
            $('p').each((i, el) => {
                const text = $(el).text().trim();
                // Look for longer paragraphs that contain the anime description
                if (text.length > 100 && !text.includes('Read More')) {
                    synopsis = text;
                    return false; // break
                }
            });
            
            if (!synopsis) {
                // Fallback to meta description
                synopsis = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || '';
            }
            
            result.synopsis = cleanText(synopsis).substring(0, 2000);

            // Extract metadata from the page - the page shows: 22 Seasons, 500 Episodes, 25 min, 2007
            const pageText = $('body').text();
            
            // Extract seasons count
            const seasonsMatch = pageText.match(/(\d+)\s*Seasons/i);
            result.totalSeasons = seasonsMatch ? parseInt(seasonsMatch[1]) : 0;

            // Extract total episodes
            const episodesMatch = pageText.match(/(\d+)\s*Episodes/i);
            result.totalEpisodes = episodesMatch ? parseInt(episodesMatch[1]) : 0;

            // Extract duration
            const durationMatch = pageText.match(/(\d+)\s*min/i);
            result.duration = durationMatch ? `${durationMatch[1]} min` : '';

            // Extract release year
            const yearMatch = pageText.match(/\b(19\d{2}|20\d{2})\b/);
            result.releaseYear = yearMatch ? yearMatch[1] : '';
            result.releaseDate = result.releaseYear;

            // Determine status based on episode numbers
            if (result.totalEpisodes > 0) {
                result.status = 'Completed';
            }

            // Extract genres from h4 > a links that follow "Genres" heading
            $('h4, h3, h2').each((i, el) => {
                if ($(el).text().toLowerCase().includes('genre')) {
                    // Get following sibling elements with genre links
                    let sibling = $(el).next();
                    while (sibling.length && sibling.find('a[href*="/category/genre/"]').length === 0) {
                        sibling = sibling.next();
                    }
                    sibling.find('a[href*="/category/genre/"]').each((j, link) => {
                        const href = $(link).attr('href');
                        const name = $(link).text().trim();
                        if (href && name) {
                            const genreId = href.split('/genre/')[1]?.replace(/\/$/, '').toLowerCase();
                            if (genreId && config.validGenres.includes(genreId)) {
                                result.genres.push({
                                    id: genreId,
                                    name: name.replace(/\b\w/g, l => l.toUpperCase()),
                                    icon: getGenreIcon(genreId)
                                });
                            }
                        }
                    });
                }
            });

            // Also try direct genre links on the page
            $('a[href*="/category/genre/"]').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();
                if (href && name && name.length > 2) {
                    const genreId = href.split('/genre/')[1]?.replace(/\/$/, '').toLowerCase();
                    if (genreId && config.validGenres.includes(genreId)) {
                        if (!result.genres.find(g => g.id === genreId)) {
                            result.genres.push({
                                id: genreId,
                                name: name.replace(/\b\w/g, l => l.toUpperCase()),
                                icon: getGenreIcon(genreId)
                            });
                        }
                    }
                }
            });

            // Extract languages from h4 > a links that follow "Languages" heading
            $('h4, h3, h2').each((i, el) => {
                if ($(el).text().toLowerCase().includes('language')) {
                    // Get following sibling elements with language links
                    let sibling = $(el).next();
                    while (sibling.length && sibling.find('a[href*="/category/language/"]').length === 0) {
                        sibling = sibling.next();
                    }
                    sibling.find('a[href*="/category/language/"]').each((j, link) => {
                        const href = $(link).attr('href');
                        const name = $(link).text().trim();
                        if (href && name) {
                            const langId = href.split('/language/')[1]?.replace(/\/$/, '').toLowerCase();
                            const langCode = config.languageCodes[langId] || langId;
                            if (!result.languages.find(l => l.code === langCode)) {
                                result.languages.push({
                                    code: langCode,
                                    name: name,
                                    native: config.languageNames[langCode] || name,
                                    flag: config.languageFlags[langCode] || '🌐'
                                });
                            }
                        }
                    });
                }
            });

            // Also try direct language links
            $('a[href*="/category/language/"]').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();
                if (href && name && name.length > 2) {
                    const langId = href.split('/language/')[1]?.replace(/\/$/, '').toLowerCase();
                    const langCode = config.languageCodes[langId] || langId;
                    if (!result.languages.find(l => l.code === langCode)) {
                        result.languages.push({
                            code: langCode,
                            name: name,
                            native: config.languageNames[langCode] || name,
                            flag: config.languageFlags[langCode] || '🌐'
                        });
                    }
                }
            });

            // Extract seasons information from the page text
            // Pattern: "Season X • Y-Z (N)" or "Season X • Y-Z (N) (Sub)" - filter out sub-only seasons
            const seasonMatches = pageText.matchAll(/Season\s*(\d+)[^•]*•\s*(\d+)[^)]*\((\d+)\)\s*([^(\n]*)/g);
            for (const match of seasonMatches) {
                const seasonNum = parseInt(match[1]);
                const startEp = parseInt(match[2]);
                const epCount = parseInt(match[3]);
                const seasonText = match[4] || '';

                // Check if this season is sub-only using comprehensive patterns from config
                const isSubOnly = config.subOnlyPatterns.some(pattern => pattern.test(seasonText));
                if (isSubOnly) {
                    continue; // Skip this season
                }

                result.seasons.push({
                    season: seasonNum,
                    title: `Season ${seasonNum}`,
                    startEpisode: startEp,
                    episodeCount: epCount,
                    episodeRange: `${startEp}-${startEp + epCount - 1}`
                });
            }

            // Extract availability information
            result.availability = {
                hasSub: result.languages.length > 0,
                hasDub: result.languages.some(l => ['hindi', 'english', 'tamil', 'telugu', 'bengali', 'malayalam'].includes(l.code)),
                languages: result.languages
            };

            // Extract related anime from "Recommended Series" section
            $('h3, h4, h2').each((i, el) => {
                if ($(el).text().toLowerCase().includes('recommend')) {
                    // Find the owl-carousel or related container after this heading
                    let container = $(el).next();
                    while (container.length && container.find('.post').length === 0) {
                        container = container.next();
                    }
                    // Extract posts from the container
                    container.find('.post').each((j, post) => {
                        if (j >= 20) return; // Limit to 20
                        
                        const link = $(post).find('a[href*="/series/"], a[href*="/movies/"], a[href*="/cartoon/"]').attr('href');
                        const title = $(post).find('img').attr('alt')?.replace(/^Image\s*/i, '').trim() || 
                                     $(post).find('.title').text().trim();
                        const poster = $(post).find('img').attr('data-src') || $(post).find('img').attr('src');
                        
                        if (link && title) {
                            const { extractIdFromUrl } = require('../utils/helpers');
                            const relatedId = extractIdFromUrl(link);
                            
                            if (relatedId) {
                                let relatedType = 'SERIES';
                                if (link.includes('/movies/')) relatedType = 'MOVIE';
                                if (link.includes('/cartoon/')) relatedType = 'CARTOON';
                                
                                if (!result.relatedAnime.find(r => r.id === relatedId)) {
                                    result.relatedAnime.push({
                                        id: relatedId,
                                        title: title,
                                        poster: normalizeUrl(poster),
                                        url: normalizeUrl(link),
                                        type: relatedType
                                    });
                                }
                            }
                        }
                    });
                }
            });

            // Also try extracting related anime from any .post elements that have series links
            $('.post').each((i, post) => {
                if (result.relatedAnime.length >= 20) return;
                
                const link = $(post).find('a[href*="/series/"], a[href*="/movies/"], a[href*="/cartoon/"]').attr('href');
                if (!link) return;
                
                const { extractIdFromUrl } = require('../utils/helpers');
                const relatedId = extractIdFromUrl(link);
                
                if (relatedId && !result.relatedAnime.find(r => r.id === relatedId)) {
                    const title = $(post).find('img').attr('alt')?.replace(/^Image\s*/i, '').trim() || 
                                 $(post).find('.title').text().trim();
                    const poster = $(post).find('img').attr('data-src') || $(post).find('img').attr('src');
                    
                    let relatedType = 'SERIES';
                    if (link.includes('/movies/')) relatedType = 'MOVIE';
                    if (link.includes('/cartoon/')) relatedType = 'CARTOON';
                    
                    result.relatedAnime.push({
                        id: relatedId,
                        title: title || relatedId,
                        poster: normalizeUrl(poster),
                        url: normalizeUrl(link),
                        type: relatedType
                    });
                }
            });

            // Add recommended_data field as alias for relatedAnime
            result.recommended_data = result.relatedAnime;

            return result;
        } catch (error) {
            console.error('[Info Extractor] Error in extractInfo:', error.message);
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
        // To be implemented by the controller
        return null;
    }

    /**
     * Set cache
     */
    setCache(key, data, ttl) {
        // To be implemented by the controller
    }

    /**
     * Get Cheerio (override)
     */
    cheerio = {
        load: require('cheerio')
    };
}

module.exports = InfoExtractor;
