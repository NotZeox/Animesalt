/**
 * Info Page Extractor for Anime Salt API
 * Extracts detailed anime information including synopsis, genres, episodes, etc.
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, extractEpisodeFromUrl, sanitizeText } = require('../utils/helpers');
const SELECTORS = require('../utils/constants').SELECTORS;

class InfoExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract anime info by ID
     */
    async extract(id, options = {}) {
        try {
            const url = this.buildUrl(id, options);
            this.currentUrl = url; // Store URL for use in other methods
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const data = {
                id: id,
                data_id: this.generateDataId(id),
                title: this.extractTitle($),
                japanese_title: this.extractJapaneseTitle($),
                poster: this.extractPoster($),
                synopsis: this.extractSynopsis($),
                showType: this.extractShowType($, url),
                animeInfo: this.extractAnimeInfo($),
                genres: this.extractGenres($),
                networks: this.extractNetworks($),
                tvInfo: this.extractTvInfo($),
                seasons: this.extractSeasons($),
                episodes: this.extractEpisodes($),
                related_data: await this.extractRelated($),
                recommended_data: await this.extractRecommended($),
            };

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[InfoExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build URL from anime ID
     */
    buildUrl(id, options = {}) {
        // Handle different ID formats
        if (id.startsWith('series/') || id.match(/^[a-z0-9-]+$/)) {
            return `${this.baseUrl}/series/${id.replace('series/', '')}/`;
        } else if (id.startsWith('movies/') || id.includes('-movie')) {
            return `${this.baseUrl}/movies/${id.replace('movies/', '')}/`;
        } else {
            return `${this.baseUrl}/series/${id}/`;
        }
    }

    /**
     * Generate numeric data ID
     */
    generateDataId(id) {
        // Simple hash-like ID generation
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Extract title from page
     */
    extractTitle($) {
        // Try og:title meta tag first
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) {
            // Remove "- Watch Now in..." suffix
            return sanitizeText(ogTitle.split(' - ')[0].trim());
        }

        // Try h1
        const h1 = $('h1').first().text().trim();
        if (h1) return sanitizeText(h1);

        // Try entry-title
        const entryTitle = $('.entry-title').first().text().trim();
        if (entryTitle) return sanitizeText(entryTitle);

        return 'Unknown';
    }

    /**
     * Extract Japanese title
     */
    extractJapaneseTitle($) {
        // Try to find Japanese title in metadata
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        if (ogTitle.includes('(')) {
            const match = ogTitle.match(/\(([^)]+)\)/);
            if (match) return sanitizeText(match[1]);
        }

        return '';
    }

    /**
     * Extract poster image
     */
    extractPoster($) {
        // Try main poster in centered div
        let poster = null;
        
        $('div[style*="margin-bottom"] img[data-src]').each((i, el) => {
            if (!poster) {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && (src.includes('tmdb') || src.includes('animesalt'))) {
                    poster = getImageUrl($(el));
                }
            }
        });

        // Fallback to post-thumbnail
        if (!poster) {
            poster = getImageUrl($('.post-thumbnail img').first());
        }

        return poster;
    }

    /**
     * Extract synopsis/description
     */
    extractSynopsis($) {
        const synopsis = $('.entry-content, .post-content, .film-description').first().text().trim();
        return sanitizeText(synopsis) || '';
    }

    /**
     * Extract show type (TV, Movie, etc.)
     */
    extractShowType($, url = '') {
        // Try to determine from URL or page content
        if (url.includes('/movies/')) return 'Movie';
        if (url.includes('/series/')) return 'TV';
        
        // Try from info items
        const typeText = $('.type, .show-type').text().trim().toLowerCase();
        if (typeText.includes('movie')) return 'Movie';
        if (typeText.includes('ova')) return 'OVA';
        if (typeText.includes('ona')) return 'ONA';
        
        return 'TV';
    }

    /**
     * Extract anime info items (duration, status, etc.)
     */
    extractAnimeInfo($) {
        const info = {};
        
        $(SELECTORS.home.infoItems).each((i, el) => {
            const $el = $(el);
            const label = $el.find('.name, .label, b').text().trim().replace(':', '');
            const value = $el.find('.text, .value').text().trim();
            
            if (label && value && label.length < 50) {
                const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                info[key] = sanitizeText(value);
            }
        });

        return info;
    }

    /**
     * Extract genres
     */
    extractGenres($) {
        const genres = [];
        
        $('a[href*="/category/genre/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && !genres.find(g => g.name === name)) {
                genres.push({
                    name: sanitizeText(name),
                    link: normalizeUrl(link),
                });
            }
        });

        return genres;
    }

    /**
     * Extract networks/studios
     */
    extractNetworks($) {
        const networks = [];
        
        $('a[href*="/category/network/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && !networks.find(n => n.name === name)) {
                networks.push({
                    name: sanitizeText(name),
                    link: normalizeUrl(link),
                });
            }
        });

        return networks;
    }

    /**
     * Extract TV info object
     */
    extractTvInfo($) {
        const info = this.extractAnimeInfo($);
        
        return {
            showType: this.extractShowType($, this.currentUrl || ''),
            duration: info.duration || info.total_time || '24 min',
            releaseDate: info.premiered || info.released || info.release_date || '',
            quality: 'HD',
            sub: 0,
            dub: 0,
            eps: this.extractEpisodeCount($),
        };
    }

    /**
     * Extract episode count
     */
    extractEpisodeCount($) {
        const episodes = this.extractEpisodes($);
        return episodes.length;
    }

    /**
     * Extract seasons (for multi-season anime)
     */
    extractSeasons($) {
        const seasons = [];
        
        // Try to find season links
        $('a[href*="/season/"]').each((i, el) => {
            const link = $(el).attr('href');
            const title = $(el).text().trim();
            
            if (link && title && !seasons.find(s => s.link === link)) {
                seasons.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    link: normalizeUrl(link),
                    season_poster: getImageUrl($(el).find('img')),
                });
            }
        });

        return seasons;
    }

    /**
     * Extract episode list
     */
    extractEpisodes($) {
        const episodes = [];
        
        $(SELECTORS.home.episodes).each((i, el) => {
            const link = $(el).attr('href');
            
            if (link && link.includes('/episode/')) {
                const epData = extractEpisodeFromUrl(link);
                const title = $(el).find('.entry-title').text().trim();
                
                if (epData) {
                    episodes.push({
                        episode_no: epData.episode,
                        id: epData.formatted,
                        title: sanitizeText(title) || '',
                        link: normalizeUrl(link),
                        data_id: this.generateDataId(link),
                    });
                }
            }
        });

        // Sort by episode number (descending - newest first)
        return episodes.sort((a, b) => b.episode_no - a.episode_no);
    }

    /**
     * Extract related anime (sidebar recommendations)
     */
    async extractRelated($) {
        const related = [];
        
        $('.related-posts .post, .similar .post').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.entry-title').text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (title && link) {
                related.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    tvInfo: {
                        showType: 'TV',
                        duration: '24 min',
                    },
                });
            }
        });

        return [related];
    }

    /**
     * Extract recommended anime
     */
    async extractRecommended($) {
        const recommended = [];
        
        $('.recommended .post, .related .post').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.entry-title').text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (title && link) {
                recommended.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    tvInfo: {
                        showType: 'TV',
                        duration: '24 min',
                    },
                });
            }
        });

        return [recommended];
    }
}

module.exports = InfoExtractor;
