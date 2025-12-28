/**
 * Movie Extractor for Anime Salt API
 * Handles movie-specific extraction (no episodes, just servers)
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, sanitizeText } = require('../utils/helpers');

class MovieExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract movie info by ID
     */
    async extract(id, options = {}) {
        try {
            const url = this.buildUrl(id);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const data = {
                id: id,
                data_id: this.generateDataId(id),
                type: 'movie',
                title: this.extractTitle($),
                japanese_title: this.extractJapaneseTitle($),
                poster: this.extractPoster($),
                synopsis: this.extractSynopsis($),
                releaseDate: this.extractReleaseDate($),
                duration: this.extractDuration($),
                animeInfo: this.extractAnimeInfo($),
                genres: this.extractGenres($),
                languages: this.extractLanguages($),
                networks: this.extractNetworks($),
                quality: this.extractQuality($),
                servers: await this.extractServers($),
                downloadLinks: this.extractDownloadLinks($),
                relatedMovies: await this.extractRelated($),
            };

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[MovieExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build movie URL
     */
    buildUrl(id, options = {}) {
        // Handle different ID formats
        if (id.startsWith('movies/')) {
            return `${this.baseUrl}/${id}/`;
        } else if (id.includes('-movie')) {
            return `${this.baseUrl}/movies/${id}/`;
        } else if (id.includes('/')) {
            return `${this.baseUrl}/${id}/`;
        } else {
            return `${this.baseUrl}/movies/${id}/`;
        }
    }

    /**
     * Generate numeric data ID
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
     * Extract movie title
     */
    extractTitle($) {
        // Try og:title meta tag first
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) {
            return sanitizeText(ogTitle.split(' - ')[0].trim());
        }

        // Try h1
        const h1 = $('h1').first().text().trim();
        if (h1) return sanitizeText(h1);

        // Try entry-title
        const entryTitle = $('.entry-title').first().text().trim();
        if (entryTitle) return sanitizeText(entryTitle);

        return 'Unknown Movie';
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
                if (src && (src.includes('tmdb') || src.includes('animesalt') || src.includes('image'))) {
                    poster = getImageUrl($(el));
                }
            }
        });

        // Fallback to og:image
        if (!poster) {
            const ogImage = $('meta[property="og:image"]').attr('content');
            if (ogImage) {
                poster = normalizeUrl(ogImage);
            }
        }

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
     * Extract release date
     */
    extractReleaseDate($) {
        // Try meta updated_time
        const metaDate = $('meta[property="og:updated_time"]').attr('content');
        if (metaDate) {
            return metaDate.split('T')[0];
        }

        // Try to find in info items
        const dateMatch = $('.info-item, .item').text().match(/\d{4}/);
        return dateMatch ? dateMatch[0] : '';
    }

    /**
     * Extract duration
     */
    extractDuration($) {
        // Try to find duration in info items
        const durationMatch = $('.info-item, .item').text().match(/(\d+)\s*min/);
        return durationMatch ? `${durationMatch[1]} min` : '90 min';
    }

    /**
     * Extract anime info items
     */
    extractAnimeInfo($) {
        const info = {};
        
        $('.info-item, .item').each((i, el) => {
            const $el = $(el);
            const label = $el.find('.name, .label, b, strong').text().trim().replace(':', '');
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
     * Extract available languages
     */
    extractLanguages($) {
        const languages = [];
        
        $('a[href*="/category/language/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && !languages.find(l => l.name === name)) {
                languages.push({
                    code: link.split('/category/language/')[1]?.replace('/', '') || '',
                    name: sanitizeText(name),
                    link: normalizeUrl(link),
                });
            }
        });

        return languages;
    }

    /**
     * Extract networks/studios
     */
    extractNetworks($) {
        const networks = [];
        
        $('a[href*="/category/network/"], a[href*="/category/studio/"]').each((i, el) => {
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
     * Extract video quality
     */
    extractQuality($) {
        const quality = $('.quality, .Qlty').text().trim();
        return quality || 'HD';
    }

    /**
     * Extract available servers (for movies, servers replace episodes)
     */
    async extractServers($) {
        const servers = [];
        const seenNames = new Set();
        
        // Look for server selection buttons or links in the player area
        // Try multiple selector patterns that animesalt.cc might use
        const serverSelectors = [
            '.server-btn',
            '.server-item',
            '[data-server]',
            '.play-video .source-btn',
            '.player-selector .server-option',
            '.stream-server .server-btn',
            'a[href*="watch"]',
        ];
        
        // Try finding server buttons in various containers
        $('.server-btn, .server-item, .source-btn, .play-btn').each((i, el) => {
            const $el = $(el);
            const serverName = $el.text().trim() || $el.attr('title') || $el.attr('data-server');
            const serverId = $el.attr('data-server') || $el.attr('value') || String(i + 1);
            
            if (serverName && !seenNames.has(serverName.toLowerCase())) {
                seenNames.add(serverName.toLowerCase());
                servers.push({
                    id: serverId,
                    name: sanitizeText(serverName),
                    type: 'sub',
                    quality: 'auto',
                });
            }
        });

        // If no servers found, look for iframes which will be the fallback
        if (servers.length === 0) {
            const iframes = [];
            $('iframe[src], iframe[data-src]').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                if (src && src.includes('http')) {
                    iframes.push({
                        server: `Server ${i + 1}`,
                        url: src,
                        type: 'iframe',
                    });
                }
            });
            
            if (iframes.length > 0) {
                return [{
                    id: '1',
                    name: 'Direct',
                    type: 'sub',
                    quality: 'auto',
                    iframes: iframes,
                }];
            }
        }

        return servers;
    }

    /**
     * Extract download links
     */
    extractDownloadLinks($) {
        const downloads = [];
        
        $('a[href*="download"], a[href*=".mp4"], a.download-btn').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            
            if (href && (href.includes('http') || href.startsWith('/'))) {
                downloads.push({
                    id: String(i + 1),
                    link: normalizeUrl(href),
                    label: text || 'Download',
                    quality: 'auto',
                });
            }
        });

        return downloads;
    }

    /**
     * Extract related movies
     */
    async extractRelated($) {
        const related = [];
        
        $('.related-posts .post, .similar .post, .recommended .post').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.entry-title, .title').text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (title && link) {
                related.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    type: link.includes('/movies/') ? 'movie' : 'series',
                });
            }
        });

        return related;
    }

    /**
     * Get streaming URL for a specific server
     */
    async getStreamUrl(id, server = null) {
        const url = this.buildUrl(id);
        const html = await fetchHTML(url);
        const $ = require('cheerio').load(html);

        // Look for iframe sources
        const iframes = [];
        $('iframe[src], iframe[data-src]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) {
                iframes.push({
                    server: `Server ${i + 1}`,
                    url: src,
                    type: 'iframe',
                });
            }
        });

        // Parse multi-language player data if available
        const multiLangSrc = $('iframe[data-src*="multi-lang-plyr"]').attr('data-src');
        if (multiLangSrc) {
            try {
                const decodedData = decodeURIComponent(multiLangSrc.split('data=')[1] || '');
                const langData = JSON.parse(decodedData);
                
                if (Array.isArray(langData)) {
                    langData.forEach((item, idx) => {
                        iframes.push({
                            server: item.language || `Server ${idx + 1}`,
                            url: item.link,
                            type: 'multi-lang',
                            language: item.language,
                        });
                    });
                }
            } catch (e) {
                console.error('[MovieExtractor] Failed to parse multi-lang data:', e.message);
            }
        }

        // Filter by server if specified
        if (server) {
            const filtered = iframes.filter(iframe => 
                iframe.server.toLowerCase().includes(server.toLowerCase())
            );
            return filtered.length > 0 ? filtered[0] : iframes[0];
        }

        return iframes[0] || null;
    }
}

module.exports = MovieExtractor;
