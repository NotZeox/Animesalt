/**
 * Info Extractor - Extract detailed information from anime/movie/cartoon pages
 */

const BaseExtractor = require('./base');
const { normalizeUrl, getGenreIcon, cleanText } = require('../utils/helpers');
const config = require('../config');

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
            };

            // Extract title
            const title = $('h1.entry-title, h1.title, .anime-title h1, .TPost .Title, h1').first().text().trim();
            result.title = title || $('meta[property="og:title"]').attr('content') || '';

            // Extract poster - multiple fallback options
            const poster = $('.anime-poster img').attr('data-src') ||
                $('.anime-poster img').attr('src') ||
                $('.poster img').attr('data-src') ||
                $('.poster img').attr('src') ||
                $('meta[property="og:image"]').attr('content') ||
                $('.TPost .Image').attr('src') ||
                $('#w_content .TPostBg').attr('src');

            result.poster = normalizeUrl(poster) || '';

            // Extract background image from watch page
            const watchUrl = this.getContentUrl(id, 'series').replace('/series/', '/watch/') + '-1x1';
            try {
                const watchHtml = await this.fetchHTML(watchUrl);
                const watch$ = this.cheerio.load(watchHtml);
                result.backgroundImage = this.getBackgroundImage(watch$);
            } catch (e) {
                // Background image is optional
                result.backgroundImage = '';
            }

            // Extract type from URL or page structure
            if (result.url.includes('/movies/')) {
                result.type = 'MOVIE';
                result.subCategory = 'Movie';
            } else if (result.url.includes('/cartoon/')) {
                result.type = 'CARTOON';
                result.subCategory = 'Series';
            }

            // Extract synopsis from multiple locations
            const synopsisSelectors = [
                '.anime-details .description, .description',
                '.anime-synopsis, .synopsis',
                '.anime-info .text, .info .text',
                '.entry-content p:first-of-type',
                '.wpb_text_column p:first-of-type',
                'meta[name="description"]',
                'meta[property="og:description"]',
            ];

            for (const selector of synopsisSelectors) {
                let synopsis = $(selector).first().text().trim();
                if (!synopsis) {
                    synopsis = $(selector).attr('content');
                }

                if (synopsis && synopsis.length > 50) {
                    // Clean up synopsis
                    result.synopsis = cleanText(synopsis)
                        .replace(/^Description:\s*/i, '')
                        .replace(/^Synopsis:\s*/i, '')
                        .substring(0, 2000);
                    break;
                }
            }

            // Extract metadata from table
            const metadata = {};
            $('li:has(.type), span.type, .meta-data li, .anime-info li').each((i, el) => {
                const typeEl = $(el).find('.type, strong');
                const valueEl = $(el).contents().last();

                if (typeEl.length && valueEl.length) {
                    const type = typeEl.text().trim().replace(/:/g, '').toLowerCase();
                    const value = valueEl.text().trim();
                    metadata[type] = value;
                }
            });

            // Parse status
            const statusText = (metadata['status'] || '').toLowerCase();
            if (statusText.includes('airing') || statusText.includes('ongoing') || statusText.includes('current')) {
                result.status = 'Ongoing';
            } else if (statusText.includes('completed') || statusText.includes('finished')) {
                result.status = 'Completed';
            } else if (statusText.includes('upcoming') || statusText.includes('tba')) {
                result.status = 'Upcoming';
            } else {
                result.status = 'Released';
            }

            // Extract release year
            const releaseYear = metadata['released'] || metadata['year'] || metadata['date'] || '';
            const yearMatch = releaseYear.match(/(\d{4})/);
            result.releaseYear = yearMatch ? yearMatch[1] : '';
            result.releaseDate = releaseYear;

            // Extract duration
            const duration = metadata['duration'] || metadata['length'] || '';
            result.duration = duration.replace(/per\s+episode/i, '').trim();

            // Extract quality
            const qualityText = (metadata['quality'] || '').toLowerCase();
            if (qualityText.includes('4k') || qualityText.includes('2160p')) {
                result.quality = '4K';
            } else if (qualityText.includes('1080p') || qualityText.includes('full hd')) {
                result.quality = '1080p';
            } else if (qualityText.includes('720p') || qualityText.includes('hd')) {
                result.quality = '720p';
            } else if (qualityText.includes('480p') || qualityText.includes('sd')) {
                result.quality = '480p';
            } else {
                result.quality = 'HD';
            }

            // Extract genres - properly separated from categories
            const foundGenres = new Set();
            $('a[href*="/category/genre/"], .genres a, [class*="genre"] a').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();

                if (href && name) {
                    const genreId = href.split('/genre/')[1]?.toLowerCase();
                    if (genreId && config.validGenres.includes(genreId) && !foundGenres.has(genreId)) {
                        foundGenres.add(genreId);
                        result.genres.push({
                            id: genreId,
                            name: name.replace(/\b\w/g, l => l.toUpperCase()),
                            icon: getGenreIcon(genreId)
                        });
                    }
                }
            });

            // Ensure core genres are present
            const coreGenres = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'isekai',
                'martial-arts', 'mecha', 'romance', 'sci-fi', 'shounen', 'slice-of-life', 'sports', 'supernatural'];

            coreGenres.forEach(genreId => {
                if (!foundGenres.has(genreId)) {
                    foundGenres.add(genreId);
                    result.genres.push({
                        id: genreId,
                        name: genreId.replace(/\b\w/g, l => l.toUpperCase()),
                        icon: getGenreIcon(genreId)
                    });
                }
            });

            // Limit to reasonable number
            result.genres = result.genres.slice(0, 15);

            // Extract languages and availability
            result.availability = this.detectRegionalAvailability($);

            // Extract languages list
            result.languages = result.availability.languages;

            // Extract download links
            result.downloadLinks = this.extractDownloadLinks($);

            // Extract networks
            $('a[href*="/network/"], .networks a').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();

                if (href && name && !result.networks.find(n => n.id === href.split('/').pop())) {
                    result.networks.push({
                        id: href.split('/').pop(),
                        name: name,
                        url: normalizeUrl(href),
                    });
                }
            });

            // Extract related anime
            const relatedIds = new Set();
            $('.related-anime, .similar-anime, .recommendations, [class*="related"] .post, [class*="recommend"] .post').each((i, el) => {
                if (i >= 50) return;

                const link = $(el).find('a[href*="/series/"], a[href*="/movies/"]').attr('href');
                const title = $(el).find('img').attr('alt') || $(el).find('.title').text().trim();
                const poster = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

                if (link && title) {
                    const { extractIdFromUrl } = require('../utils/helpers');
                    const relatedId = extractIdFromUrl(link);

                    if (relatedId && !relatedIds.has(relatedId)) {
                        relatedIds.add(relatedId);

                        let relatedType = 'SERIES';
                        if (link.includes('/movies/')) relatedType = 'MOVIE';
                        if (link.includes('/cartoon/')) relatedType = 'CARTOON';

                        result.relatedAnime.push({
                            id: relatedId,
                            title: title.replace(/^Image /, '').trim(),
                            poster: normalizeUrl(poster),
                            url: normalizeUrl(link),
                            type: relatedType,
                        });
                    }
                }
            });

            // Extract other names/aliases
            $('.other-names, .aliases, .alternate-titles').each((i, el) => {
                const names = $(el).text().split(',').map(n => n.trim()).filter(n => n && n !== result.title);
                result.otherNames.push(...names);
            });

            // Extract episode count for series
            if (result.type === 'SERIES') {
                const epMatch = $('li:has(.type:contains("Episodes")), .episodes-info, [class*="episodes"]').text().match(/(\d+)/);
                if (epMatch) {
                    result.totalEpisodes = parseInt(epMatch[1]);
                } else {
                    // Count episode links
                    result.totalEpisodes = $('a[href*="-1x"], a[href*="-episode-"]').length || 0;
                }

                // If still 0, try counting all episode links
                if (result.totalEpisodes === 0) {
                    result.totalEpisodes = $('a[href*="/episode/"]').length || 0;
                }
            }

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
