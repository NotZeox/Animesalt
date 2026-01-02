/**
 * Base Extractor - Base class for all extractors
 */

const cheerio = require('cheerio');
const { fetchHTML } = require('../utils/request');
const { normalizeUrl, getContentType } = require('../utils/helpers');
const config = require('../config');

/**
 * Base Extractor class that provides common functionality
 */
class BaseExtractor {
    /**
     * Create a new BaseExtractor instance
     * @param {string} baseUrl - Base URL for the extractor
     */
    constructor(baseUrl = config.baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Load HTML and return Cheerio instance
     * @param {string} url - URL to fetch
     * @returns {object} - Cheerio instance
     */
    async loadPage(url) {
        const html = await fetchHTML(url);
        return cheerio.load(html);
    }

    /**
     * Get the URL for a specific content
     * @param {string} id - Content ID
     * @param {string} type - Content type
     * @returns {string} - Full URL
     */
    getContentUrl(id, type = 'series') {
        const typeMap = {
            'series': 'series',
            'movie': 'movies',
            'movies': 'movies',
            'cartoon': 'cartoon',
        };

        const contentType = typeMap[type.toLowerCase()] || 'series';
        return `${this.baseUrl}/${contentType}/${id}`;
    }

    /**
     * Detect content type from URL
     * @param {string} url - URL to check
     * @returns {string} - Content type
     */
    detectContentType(url) {
        return getContentType(url);
    }

    /**
     * Parse anime item from post element
     * @param {object} $ - Cheerio instance
     * @param {object} $el - Element to parse
     * @returns {object|null} - Parsed item or null
     */
    parseAnimeItem($, $el) {
        // Find the link inside the post
        const link = $el.find('a.lnk-blk').attr('href') ||
            $el.find('a[href*="/series/"]').attr('href') ||
            $el.find('a[href*="/movies/"]').attr('href');

        // Get title from img alt or from the post text
        const title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim() ||
            $el.find('.Title, .entry-title, .title').text().trim() ||
            $el.text().substring(0, 100).trim();

        // Get poster from img data-src or src
        const poster = $el.find('img').attr('data-src') ||
            $el.find('img').attr('src') ||
            $el.find('img').attr('data-lazy-src');

        if (!link || !title) return null;

        const { extractIdFromUrl, parseEpisodeFormat } = require('../utils/helpers');
        const id = extractIdFromUrl(link);
        const epInfo = parseEpisodeFormat($el.text());
        const epMatch = $el.text().match(/EP[:\s]*(\d+)/i);

        // Detect if it's a cartoon
        const isCartoon = title.toLowerCase().includes('cartoon') ||
            link.includes('/cartoon/') ||
            $el.text().toLowerCase().includes('cartoon');

        // Detect sub-category
        const pageText = $el.text().toLowerCase();
        let subCategory = 'TV Series';
        if (title.toLowerCase().includes('movie') || link.includes('/movies/')) {
            subCategory = 'Movie';
        } else if (pageText.includes('ova') || pageText.includes('OAD') || pageText.includes('special')) {
            subCategory = 'OVA/Special';
        } else if (pageText.includes('ona')) {
            subCategory = 'ONA';
        }

        return {
            id: id,
            title: title,
            poster: normalizeUrl(poster),
            url: normalizeUrl(link),
            latestEpisode: epMatch ? epMatch[1] : null,
            season: epInfo.season,
            episode: epInfo.episode,
            episodeLabel: epInfo.episode ? `${epInfo.season}xEP:${epInfo.episode}` : null,
            type: link.includes('/movies/') ? 'MOVIE' : (isCartoon ? 'CARTOON' : 'SERIES'),
            isCartoon: isCartoon,
            subCategory: subCategory,
        };
    }

    /**
     * Detect regional language availability
     * @param {object} $ - Cheerio instance
     * @returns {object} - Availability object
     */
    detectRegionalAvailability($) {
        const availability = {
            hasSub: true,
            hasDub: false,
            languages: [],
            notes: [],
            unavailableRegions: []
        };

        // Check page content for language indicators
        let pageText = '';
        try {
            const bodyText = $('body').text();
            pageText = bodyText ? String(bodyText).toLowerCase() : '';
        } catch (e) {
            pageText = '';
        }

        // Check which languages are mentioned
        for (const [lang, patterns] of Object.entries(config.languagePatterns)) {
            for (const pattern of patterns) {
                if (pageText.includes(pattern)) {
                    if (!availability.languages.includes(lang)) {
                        availability.languages.push(lang);
                    }
                    if (pattern.includes('dub')) {
                        availability.hasDub = true;
                    }
                    if (pattern.includes('sub') && !pattern.includes('dub')) {
                        availability.hasSub = true;
                    }
                    break;
                }
            }
        }

        // Check for unavailable content
        const unavailablePatterns = [
            /not available in (.+?)(?:\.|,|$)/gi,
            /unavailable in (.+?)(?:\.|,|$)/gi,
            /missing in (.+?)(?:\.|,|$)/gi,
            /(.+?) dub not available/gi,
            /only subbed in (.+?)(?:\.|,|$)/gi,
        ];

        for (const pattern of unavailablePatterns) {
            let match;
            while ((match = pattern.exec(pageText)) !== null) {
                const region = match[1].trim();
                if (region && !availability.unavailableRegions.includes(region)) {
                    availability.unavailableRegions.push(region);
                    availability.notes.push(`Not available in ${region}`);
                }
            }
        }

        // Default to sub only if no languages found
        if (availability.languages.length === 0) {
            availability.languages = ['Subtitles Available'];
            availability.notes.push('Subtitles may be available');
        }

        return availability;
    }

    /**
     * Extract download links from page
     * @param {object} $ - Cheerio instance
     * @returns {array} - Array of download links
     */
    extractDownloadLinks($) {
        const downloads = [];

        // Check for download buttons/links
        $('a[href*="download"], a[href*="dl="], a[href*="drive.google"], a[href*="mega"], a[href*="1fichier"], a[href*="zippy"]').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim().toLowerCase();

            if (href) {
                const { extractQuality, extractHost } = require('../utils/helpers');

                const quality = extractQuality(text);
                const host = extractHost(href);

                downloads.push({
                    quality: quality,
                    host: host,
                    url: normalizeUrl(href),
                    text: $(el).text().trim() || `Download ${quality}`
                });
            }
        });

        // Also check for specific download button classes
        $('.download-btn, .download-button, .dl-btn, a.btn-download, .TDDownloads a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href) {
                const existing = downloads.find(d => d.url === href);
                if (!existing) {
                    downloads.push({
                        quality: 'Auto',
                        host: 'Direct',
                        url: normalizeUrl(href),
                        text: text || 'Download'
                    });
                }
            }
        });

        return downloads;
    }

    /**
     * Get background image from watch page
     * @param {object} $ - Cheerio instance
     * @returns {string|null} - Background image URL or null
     */
    getBackgroundImage($) {
        const bg = $('.TPostBg').attr('data-src') ||
            $('.TPostBg').attr('src') ||
            $('meta[property="og:image"]').attr('content');

        return normalizeUrl(bg);
    }

    /**
     * Check if episode is in sub-only section
     * @param {object} $ - Cheerio instance
     * @param {object} $el - Episode element
     * @returns {boolean} - True if in sub-only section
     */
    isSubOnlyEpisode($, $el) {
        // Check if there's an episodes-separator element
        const separator = $('.episodes-separator, [class*="episodes-separator"]');

        if (separator.length === 0) {
            return false;
        }

        // Check if the episode element comes after the separator
        const separatorIndex = separator.index();
        const episodeIndex = $el.index();

        return episodeIndex > separatorIndex;
    }
}

module.exports = BaseExtractor;
