/**
 * Info Page Extractor for Anime Salt API v2
 * Extracts detailed anime information matching itzzzme/anime-api format
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, extractEpisodeFromUrl, sanitizeText } = require('../utils/helpers');
const SELECTORS = require('../utils/constants').SELECTORS;

// Network icons in SVG format for anime details page
const NETWORK_ICONS = {
    'crunchyroll': {
        name: 'Crunchyroll',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Crunchyroll"><path d="M4.5 4.5h15v12h-15z"/><path d="M4.5 16.5h15v3h-15z" fill="#F47521"/></svg>`,
        color: '#F47521',
    },
    'netflix': {
        name: 'Netflix',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Netflix"><path d="M4 4h4v16H4zM14 4h4v16h-4zM6 8h10v8H6z" fill="#E50914"/></svg>`,
        color: '#E50914',
    },
    'funimation': {
        name: 'Funimation',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Funimation"><circle cx="12" cy="12" r="10" fill="#5B3E96"/><path d="M12 6l6 4-6 4-6-4z" fill="#FFF"/></svg>`,
        color: '#5B3E96',
    },
    'hidive': {
        name: 'HiDive',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="HiDive"><rect x="4" y="4" width="16" height="16" rx="2" fill="#1A1A2E"/><circle cx="12" cy="12" r="4" fill="#00D4FF"/></svg>`,
        color: '#00D4FF',
    },
    'disney-plus': {
        name: 'Disney+',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Disney Plus"><circle cx="12" cy="12" r="9" fill="#113CCF"/><text x="12" y="16" text-anchor="middle" font-size="7" font-weight="bold" fill="white">D</text></svg>`,
        color: '#113CCF',
    },
    'hulu': {
        name: 'Hulu',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Hulu"><rect x="4" y="6" width="16" height="12" rx="2" fill="#1CE783"/><circle cx="8" cy="12" r="2" fill="white"/><circle cx="12" cy="12" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/></svg>`,
        color: '#1CE783',
    },
    'amazon-prime': {
        name: 'Prime Video',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Prime Video"><path d="M4 4h16v12H4z" fill="#00A8E1"/><path d="M6 16h12v4H6z" fill="#00A8E1"/><polygon points="20,4 24,4 24,20 20,20" fill="white"/></svg>`,
        color: '#00A8E1',
    },
    'apple-tv': {
        name: 'Apple TV+',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Apple TV"><circle cx="12" cy="12" r="9" fill="#1D1D1F"/><circle cx="12" cy="12" r="3" fill="white"/></svg>`,
        color: '#1D1D1F',
    },
    'bilibili': {
        name: 'Bilibili',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Bilibili"><path d="M4.5 6.5h15v10h-15z" fill="#00A1D6"/><path d="M4 16.5h3v3h-3zM17 16.5h3v3h-3z" fill="#00A1D6"/><path d="M7.5 4.5l3 4.5h-2v6h-2v-6h-2l3-4.5z" fill="#F25C8D"/></svg>`,
        color: '#00A1D6',
    },
};

class InfoExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract anime info by ID
     * Returns comprehensive anime details matching itzzzme/anime-api format
     */
    async extract(id, options = {}) {
        try {
            const url = this.buildUrl(id, options);
            this.currentUrl = url;
            console.log(`[InfoExtractor] Fetching: ${url}`);

            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            // Check if anime exists
            if ($('.not-found, .error-404').length > 0 || $('h1').text().includes('404')) {
                return {
                    success: false,
                    error: 'Anime not found',
                };
            }

            const data = {
                adultContent: false, // Check if adult content
                id: id,
                data_id: this.generateDataId(id),
                title: this.extractTitle($),
                japanese_title: this.extractJapaneseTitle($),
                poster: this.extractPoster($),
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

            // Check for adult content flag
            if ($('.adult-content, .nsfw').length > 0 || 
                $('meta[name="adult"]').attr('content') === 'true') {
                data.adultContent = true;
            }

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
        if (id.startsWith('series/') || id.match(/^[a-z0-9-]+$/)) {
            return `${this.baseUrl}/series/${id.replace('series/', '')}/`;
        } else if (id.startsWith('movies/') || id.includes('-movie')) {
            return `${this.baseUrl}/movies/${id.replace('movies/', '')}/`;
        } else if (id.includes('/')) {
            return `${this.baseUrl}/${id}/`;
        } else {
            return `${this.baseUrl}/series/${id}/`;
        }
    }

    /**
     * Generate numeric data ID
     */
    generateDataId(id) {
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
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle) {
            return sanitizeText(ogTitle.split(' - ')[0].split('|')[0].trim());
        }

        const h1 = $('h1').first().text().trim();
        if (h1) return sanitizeText(h1);

        const entryTitle = $('.entry-title').first().text().trim();
        if (entryTitle) return sanitizeText(entryTitle);

        return 'Unknown';
    }

    /**
     * Extract Japanese title
     */
    extractJapaneseTitle($) {
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        if (ogTitle.includes('(') && ogTitle.includes(')')) {
            const match = ogTitle.match(/\(([^)]+)\)/);
            if (match) {
                const japanese = match[1].trim();
                // Check if it's actually Japanese characters
                if (/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(japanese)) {
                    return sanitizeText(japanese);
                }
            }
        }

        // Try to find Japanese title in page
        const jpElement = $('[lang="ja"], .jp-title, .japanese-title');
        if (jpElement.length > 0) {
            return sanitizeText(jpElement.text().trim());
        }

        return '';
    }

    /**
     * Extract poster image
     */
    extractPoster($) {
        let poster = null;
        
        // Try OG image first
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
            return ogImage;
        }

        // Try poster container
        $('div[style*="margin-bottom"] img[data-src]').each((i, el) => {
            if (!poster) {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && (src.includes('tmdb') || src.includes('animesalt') || src.includes('image'))) {
                    poster = getImageUrl($(el));
                }
            }
        });

        if (!poster) {
            poster = getImageUrl($('.post-thumbnail img').first());
        }

        if (!poster) {
            poster = getImageUrl($('.anime-info img').first());
        }

        return poster;
    }

    /**
     * Extract synopsis/description
     */
    extractSynopsis($) {
        const synopsis = $('.entry-content, .post-content, .film-description, .anime-synopsis').first().text().trim();
        return sanitizeText(synopsis) || '';
    }

    /**
     * Extract show type (TV, Movie, etc.)
     */
    extractShowType($, url = '') {
        if (url.includes('/movies/')) return 'Movie';
        if (url.includes('/series/')) return 'TV';
        if (url.includes('/ona/')) return 'ONA';
        if (url.includes('/ova/')) return 'OVA';
        
        const typeText = $('.type, .show-type, .anime-type').text().trim().toLowerCase();
        if (typeText.includes('movie')) return 'Movie';
        if (typeText.includes('ova')) return 'OVA';
        if (typeText.includes('ona')) return 'ONA';
        if (typeText.includes('special')) return 'Special';
        
        return 'TV';
    }

    /**
     * Extract anime info items matching itzzzme format
     * Returns: Overview, Japanese, Synonyms, Aired, Premiered, Duration, Status, MAL Score, Genres, Studios, Producers
     */
    extractAnimeInfo($) {
        const info = {};
        
        // Initialize with default structure
        info.Overview = this.extractSynopsis($);
        info.Japanese = this.extractJapaneseTitle($);
        info.Synonyms = '';
        info.Aired = '';
        info.Premiered = '';
        info.Duration = '';
        info.Status = '';
        info.MAL_Score = '';
        info.Genres = [];
        info.Studios = '';
        info.Producers = [];

        // Extract from info items
        $(SELECTORS.home.infoItems).each((i, el) => {
            const $el = $(el);
            let label = $el.find('.name, .label, b, strong, dt').text().trim().replace(':', '');
            let value = $el.find('.text, .value, dd, span:not(.name):not(.label)').text().trim();
            
            // Clean up label
            label = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            if (label && value && value.length < 200) {
                switch (label) {
                    case 'japanese':
                    case 'japannese':
                        info.Japanese = sanitizeText(value);
                        break;
                    case 'synonyms':
                        info.Synonyms = sanitizeText(value);
                        break;
                    case 'aired':
                    case 'release_date':
                        info.Aired = sanitizeText(value);
                        break;
                    case 'premiered':
                        info.Premiered = sanitizeText(value);
                        break;
                    case 'duration':
                    case 'total_time':
                        info.Duration = sanitizeText(value);
                        break;
                    case 'status':
                        info.Status = sanitizeText(value);
                        break;
                    case 'mal_score':
                    case 'score':
                        info.MAL_Score = sanitizeText(value);
                        break;
                    case 'studios':
                    case 'studio':
                        info.Studios = sanitizeText(value);
                        break;
                    case 'producers':
                        info.Producers = sanitizeText(value);
                        break;
                }
            }
        });

        // Extract genres as array
        const genreList = [];
        $('a[href*="/category/genre/"]').each((i, el) => {
            const name = $(el).text().trim();
            if (name && !genreList.includes(name)) {
                genreList.push(sanitizeText(name));
            }
        });
        info.Genres = genreList;

        // Try to extract year from text
        const pageText = $('body').text();
        const yearMatch = pageText.match(/(19|20)\d{2}/);
        if (yearMatch && !info.Aired) {
            info.Aired = yearMatch[0];
        }

        return info;
    }

    /**
     * Extract genres with icons
     */
    extractGenres($) {
        const genres = [];
        
        const genreIcons = {
            'action': '⚔️',
            'adventure': '🗺️',
            'comedy': '😂',
            'drama': '🎭',
            'ecchi': '😏',
            'fantasy': '🧙',
            'harem': '👥',
            'horror': '👻',
            'isekai': '🔄',
            'josei': '👩',
            'kids': '👶',
            'magic': '✨',
            'martial-arts': '🥋',
            'mecha': '🤖',
            'military': '🎖️',
            'music': '🎵',
            'mystery': '🔍',
            'psychological': '🧠',
            'romance': '💕',
            'samurai': '🎎',
            'school': '🏫',
            'sci-fi': '🚀',
            'seinen': '👨',
            'shoujo': '👧',
            'shounen': '👦',
            'slice-of-life': '☕',
            'sports': '⚽',
            'supernatural': '🔮',
            'thriller': '😱',
        };
        
        $('a[href*="/category/genre/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && !genres.find(g => g.name === name)) {
                const genreKey = name.toLowerCase().replace(/\s+/g, '-');
                genres.push({
                    name: sanitizeText(name),
                    icon: genreIcons[genreKey] || '🎬',
                    link: normalizeUrl(link),
                });
            }
        });

        return genres;
    }

    /**
     * Extract networks/studios with icons
     */
    extractNetworks($) {
        const networks = [];
        
        $('a[href*="/category/network/"], a[href*="/category/studio/"], a[href*="/category/producer/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && !networks.find(n => n.name === name)) {
                const networkKey = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const iconData = NETWORK_ICONS[networkKey] || { 
                    name: name, 
                    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4"/><text x="12" y="15" text-anchor="middle" font-size="8" fill="white">${name.charAt(0)}</text></svg>`,
                    color: '#666666',
                };
                
                networks.push({
                    id: networkKey,
                    name: iconData.name,
                    icon: iconData.icon,
                    color: iconData.color,
                    link: normalizeUrl(link),
                });
            }
        });

        return networks;
    }

    /**
     * Extract TV info object matching itzzzme format
     */
    extractTvInfo($) {
        const info = this.extractAnimeInfo($);
        
        // Count sub and dub episodes from episode list
        const episodeLinks = $('a[href*="/episode/"]');
        let subCount = 0;
        let dubCount = 0;
        
        episodeLinks.each((i, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('sub')) subCount++;
            if (text.includes('dub')) dubCount++;
        });

        return {
            showType: this.extractShowType($, this.currentUrl || ''),
            duration: info.Duration || '24 min',
            releaseDate: info.Premiered || info.Aired || '',
            quality: 'HD',
            sub: subCount,
            dub: dubCount,
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
        
        // Method 1: Try to find season links
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
        
        // Method 2: If no season links, extract season count from page text
        if (seasons.length === 0) {
            const pageText = $('body').text();
            const seasonMatch = pageText.match(/(\d+)\s*Seasons?/i);
            const episodeMatch = pageText.match(/(\d+)\s*Episodes?/i);
            
            if (seasonMatch) {
                const totalSeasons = parseInt(seasonMatch[1], 10);
                const totalEpisodes = episodeMatch ? parseInt(episodeMatch[1], 10) : 0;
                
                if (totalSeasons > 0) {
                    const episodesPerSeason = totalEpisodes > 0 && totalSeasons > 0 
                        ? Math.ceil(totalEpisodes / totalSeasons) 
                        : 25;
                    
                    for (let i = 1; i <= totalSeasons; i++) {
                        const startEp = (i - 1) * episodesPerSeason + 1;
                        const endEp = Math.min(i * episodesPerSeason, totalEpisodes > 0 ? totalEpisodes : i * episodesPerSeason);
                        const epCount = totalEpisodes > 0 ? (endEp - startEp + 1) : episodesPerSeason;
                        
                        seasons.push({
                            id: `season-${i}`,
                            data_number: i,
                            title: `Season ${i}`,
                            link: '',
                            total_episodes: epCount,
                        });
                    }
                }
            }
        }

        return seasons;
    }

    /**
     * Extract episode list
     */
    extractEpisodes($) {
        const episodes = [];
        
        $(SELECTORS.home.episodes).each((i, el) => {
            const $episodeEl = $(el);
            const link = $episodeEl.attr('href');
            
            if (link && link.includes('/episode/')) {
                const epData = extractEpisodeFromUrl(link);
                const title = $episodeEl.find('.entry-title').text().trim();
                
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

        return episodes.sort((a, b) => b.episode_no - a.episode_no);
    }

    /**
     * Extract related anime (sidebar recommendations)
     */
    async extractRelated($) {
        const related = [];
        
        $('.related-posts .post, .similar .post, [class*="related"] .post').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.entry-title').text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (title && link) {
                const type = link.includes('/movies/') ? 'Movie' : 'TV';
                related.push({
                    duration: '24 min',
                    data_id: this.generateDataId(link),
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    tvInfo: {
                        showType: type,
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
        
        $('.recommended .post, .related .post, [class*="recommend"] .post').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.entry-title').text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (title && link) {
                const type = link.includes('/movies/') ? 'Movie' : 'TV';
                recommended.push({
                    duration: '24 min',
                    data_id: this.generateDataId(link),
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    tvInfo: {
                        showType: type,
                        duration: '24 min',
                    },
                });
            }
        });

        return [recommended];
    }
}

module.exports = InfoExtractor;
