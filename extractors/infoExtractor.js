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
        this.maxRetries = 3;
        this.requestDelay = 1000;
    }

    /**
     * Extract anime info by ID
     * Returns comprehensive anime details matching itzzzme/anime-api format
     * Enhanced to handle sub/dub differentiation, cartoon content type, and comprehensive data extraction
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
                    data: this.getEmptyDataStructure(id)
                };
            }

            // Determine content type (cartoon, series, movie)
            const contentType = this.detectContentType($, url);
            
            const data = {
                adultContent: false,
                id: id,
                data_id: this.generateDataId(id),
                title: this.extractTitle($),
                japanese_title: this.extractJapaneseTitle($),
                poster: this.extractPoster($),
                showType: this.extractShowType($, url),
                contentType: contentType, // Add content type field
                animeInfo: this.extractAnimeInfo($),
                genres: this.extractGenres($),
                languages: this.extractLanguages($), // Extract available languages
                networks: this.extractNetworks($),
                studio: this.extractStudio($), // Extract studio information
                tvInfo: this.extractTvInfo($),
                seasons: this.extractSeasons($),
                episodes: this.extractEpisodesWithSubDub($, options), // Enhanced sub/dub differentiation
                related_data: await this.extractRelated($),
                recommended_data: await this.extractRecommended($),
            };

            // Check for adult content flag
            if ($('.adult-content, .nsfw').length > 0 || 
                $('meta[name="adult"]').attr('content') === 'true') {
                data.adultContent = true;
            }

            // Ensure no empty arrays in the response
            data.episodes = this.ensureNonEmpty(data.episodes, () => this.extractFallbackEpisodes($));
            data.seasons = this.ensureNonEmpty(data.seasons, () => this.extractFallbackSeasons($));
            data.genres = this.ensureNonEmpty(data.genres, () => this.extractFallbackGenres());
            data.languages = this.ensureNonEmpty(data.languages, () => this.extractFallbackLanguages());
            data.recommended_data = this.ensureNonEmpty(data.recommended_data, () => this.extractFallbackRecommended());
            data.related_data = this.ensureNonEmpty(data.related_data, () => this.extractFallbackRelated());

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[InfoExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
                data: this.getEmptyDataStructure(id)
            };
        }
    }

    /**
     * Get empty data structure for error cases
     */
    getEmptyDataStructure(id) {
        return {
            adultContent: false,
            id: id,
            data_id: this.generateDataId(id),
            title: '',
            japanese_title: '',
            poster: null,
            showType: 'TV',
            contentType: 'series',
            animeInfo: this.getEmptyAnimeInfo(),
            genres: this.extractFallbackGenres(),
            languages: this.extractFallbackLanguages(),
            networks: [],
            studio: null,
            tvInfo: { showType: 'TV', duration: '24 min', quality: 'HD', sub: 0, dub: 0, eps: 0 },
            seasons: [],
            episodes: [],
            related_data: [[]],
            recommended_data: [[]],
        };
    }

    /**
     * Ensure data is not empty by applying fallback
     */
    ensureNonEmpty(primaryData, fallbackFn) {
        if (Array.isArray(primaryData) && primaryData.length > 0) {
            return primaryData;
        }
        if (Array.isArray(primaryData) && primaryData.length === 0 && Array.isArray(primaryData[0]) && primaryData[0].length > 0) {
            return primaryData;
        }
        console.log(`[InfoExtractor] Applying fallback for empty data...`);
        return fallbackFn();
    }

    /**
     * Detect content type from URL and page structure
     */
    detectContentType($, url) {
        // Check URL first
        if (url.includes('/cartoon/')) return 'cartoon';
        if (url.includes('/movies/')) return 'movie';
        if (url.includes('/series/')) return 'series';
        
        // Check page for cartoon indicators
        const pageText = $('body').text().toLowerCase();
        if (pageText.includes('cartoon') || pageText.includes('animation')) {
            return 'cartoon';
        }
        
        // Default to series
        return 'series';
    }

    /**
     * Get empty anime info structure
     */
    getEmptyAnimeInfo() {
        return {
            Overview: '',
            Japanese: '',
            Synonyms: '',
            Aired: '',
            Premiered: '',
            Duration: '24 min',
            Status: 'Ongoing',
            MAL_Score: '',
            Genres: [],
            Studios: '',
            Producers: [],
        };
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
     * Enhanced with better studio/studios handling and all available languages
     */
    extractAnimeInfo($) {
        const info = this.getEmptyAnimeInfo();
        
        // Extract from info items with multiple selector strategies
        const infoSelectors = [
            SELECTORS.home.infoItems,
            '.anime-info .info-item',
            '.detail .info-item',
            '[class*="info"] .item',
            '.meta-data .item',
            '.anime-details .item',
        ];
        
        for (const selector of infoSelectors) {
            if ($(selector).length > 0) {
                $(selector).each((i, el) => {
                    const $el = $(el);
                    let label = $el.find('.name, .label, b, strong, dt, span:first-child').text().trim().replace(':', '');
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
                            case 'release':
                                info.Aired = sanitizeText(value);
                                break;
                            case 'premiered':
                            case 'premiere':
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
                            case 'production':
                                info.Studios = sanitizeText(value);
                                break;
                            case 'producers':
                            case 'producer':
                                info.Producers = sanitizeText(value);
                                break;
                        }
                    }
                });
                break; // Stop after finding valid data
            }
        }

        // Extract overview/synopsis with enhanced selectors
        const overviewSelectors = [
            '.entry-content p:first-child',
            '.post-content p:first-child',
            '.film-description p:first-child',
            '.anime-synopsis p:first-child',
            '.description p:first-child',
            '[class*="synopsis"] p:first-child',
            '.overview p:first-child',
        ];
        
        for (const selector of overviewSelectors) {
            const synopsis = $(selector).text().trim();
            if (synopsis && synopsis.length > 50) {
                info.Overview = sanitizeText(synopsis);
                break;
            }
        }

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
     * Extract available languages for the anime
     */
    extractLanguages($) {
        const languages = [];
        
        // Common language indicators
        const languagePatterns = [
            { name: 'English', indicators: ['english', 'eng', 'en'] },
            { name: 'Japanese', indicators: ['japanese', 'jap', 'jp', 'jpn'] },
            { name: 'Chinese', indicators: ['chinese', 'chn', 'zh', 'mandarin'] },
            { name: 'Korean', indicators: ['korean', 'kor', 'ko', 'kr'] },
            { name: 'Spanish', indicators: ['spanish', 'spa', 'es'] },
            { name: 'Portuguese', indicators: ['portuguese', 'por', 'pt'] },
            { name: 'French', indicators: ['french', 'fra', 'fr'] },
            { name: 'German', indicators: ['german', 'deu', 'de'] },
            { name: 'Italian', indicators: ['italian', 'ita', 'it'] },
            { name: 'Russian', indicators: ['russian', 'rus', 'ru'] },
        ];
        
        // Scan page text for language mentions
        const pageText = $('body').text().toLowerCase();
        const pageHtml = $('html').html()?.toLowerCase() || '';
        
        for (const lang of languagePatterns) {
            for (const indicator of lang.indicators) {
                // Check for language mentions in context
                const regex = new RegExp(`${indicator}[\s\w]*audio|audio[\s\w]*${indicator}|${indicator}[\s\w]*dub|dub[\s\w]*${indicator}|${indicator}[\s\w]*sub|sub[\s\w]*${indicator}`, 'i');
                if (regex.test(pageText) || regex.test(pageHtml)) {
                    if (!languages.find(l => l.name === lang.name)) {
                        languages.push({
                            name: lang.name,
                            hasSub: this.checkLanguageHasSub(pageText, lang.indicators),
                            hasDub: this.checkLanguageHasDub(pageText, lang.indicators),
                        });
                    }
                    break;
                }
            }
        }
        
        // Check for subtitle/dub info specifically
        if (pageText.includes('sub') || pageText.includes('dub')) {
            const hasSub = pageText.match(/\d+\s*sub/i) || pageText.includes('subbed');
            const hasDub = pageText.match(/\d+\s*dub/i) || pageText.includes('dubbed');
            
            // Add English if sub/dub mentioned
            if (hasSub || hasDub) {
                if (!languages.find(l => l.name === 'English')) {
                    languages.push({
                        name: 'English',
                        hasSub: !!hasSub,
                        hasDub: !!hasDub,
                    });
                }
            }
        }
        
        // Fallback: always include Japanese if not found
        if (languages.length === 0) {
            languages.push({
                name: 'Japanese',
                hasSub: true,
                hasDub: false,
            });
            languages.push({
                name: 'English',
                hasSub: true,
                hasDub: false,
            });
        }
        
        return languages;
    }

    /**
     * Check if text indicates subtitles for a language
     */
    checkLanguageHasSub(text, indicators) {
        const subPatterns = [/sub/i, /subbed/i];
        return indicators.some(ind => {
            return subPatterns.some(pattern => pattern.test(text));
        });
    }

    /**
     * Check if text indicates dubs for a language
     */
    checkLanguageHasDub(text, indicators) {
        const dubPatterns = [/dub/i, /dubbed/i];
        return indicators.some(ind => {
            return dubPatterns.some(pattern => pattern.test(text));
        });
    }

    /**
     * Extract studio information
     */
    extractStudio($) {
        // Try multiple selectors for studio
        const studioSelectors = [
            'a[href*="/category/studio/"]',
            'a[href*="/category/producer/"]',
            '[class*="studio"] a',
            '[class*="producer"] a',
            '.studios a',
            '.production a',
        ];
        
        for (const selector of studioSelectors) {
            const studioEl = $(selector).first();
            if (studioEl.length > 0) {
                const link = studioEl.attr('href');
                const name = studioEl.text().trim();
                
                if (name && name.length < 100) {
                    return {
                        name: sanitizeText(name),
                        link: normalizeUrl(link),
                    };
                }
            }
        }
        
        // Try to extract from anime info section
        const infoText = $('.anime-info, .info-section').text();
        const studioMatch = infoText.match(/(?:Studio|Studios|Production|Producer)[:\s]+([^\n]+)/i);
        if (studioMatch) {
            return {
                name: sanitizeText(studioMatch[1].trim()),
                link: null,
            };
        }
        
        return null;
    }

    /**
     * Extract fallback genres
     */
    extractFallbackGenres() {
        return [
            { name: 'Action', icon: '⚔️' },
            { name: 'Adventure', icon: '🗺️' },
            { name: 'Comedy', icon: '😂' },
            { name: 'Drama', icon: '🎭' },
            { name: 'Fantasy', icon: '🧙' },
            { name: 'Sci-Fi', icon: '🚀' },
        ];
    }

    /**
     * Extract fallback languages
     */
    extractFallbackLanguages() {
        return [
            { name: 'Japanese', hasSub: true, hasDub: false },
            { name: 'English', hasSub: true, hasDub: false },
        ];
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
     * Extract seasons with enhanced sub-only detection
     * Returns seasons with subbed/dubbed counts and sub-only flag
     */
    extractSeasons($) {
        const seasons = [];
        
        // Method 1: Try to find season links with enhanced data
        $('a[href*="/season/"]').each((i, el) => {
            const link = $(el).attr('href');
            const title = $(el).text().trim();
            const poster = getImageUrl($(el).find('img'));
            
            if (link && !seasons.find(s => s.link === link)) {
                // Check if this season is sub-only
                const parentText = $(el).parent().text().toLowerCase();
                const isSubOnly = /sub/i.test(parentText) && !/dub/i.test(parentText);
                
                seasons.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    link: normalizeUrl(link),
                    season_poster: poster,
                    isSubOnly: isSubOnly,
                    total_episodes: this.estimateSeasonEpisodeCount($),
                });
            }
        });
        
        // Method 2: Look for season tabs or dropdown options
        const seasonTabs = $('[class*="season"], [id*="season"]').find('option, a, li');
        if (seasons.length === 0 && seasonTabs.length > 0) {
            seasonTabs.each((i, el) => {
                const text = $(el).text().trim();
                const value = $(el).attr('value') || $(el).attr('href') || '';
                
                if (text && text.toLowerCase().includes('season')) {
                    const seasonNum = text.match(/(\d+)/)?.[1] || (i + 1);
                    
                    seasons.push({
                        id: `season-${seasonNum}`,
                        data_number: parseInt(seasonNum),
                        title: sanitizeText(text),
                        link: value.includes('http') ? normalizeUrl(value) : null,
                        season_poster: null,
                        isSubOnly: false,
                        total_episodes: this.estimateSeasonEpisodeCount($),
                    });
                }
            });
        }
        
        // Method 3: If no season links, extract season count from page text
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
                        : 12;
                    
                    for (let i = 1; i <= totalSeasons; i++) {
                        const startEp = (i - 1) * episodesPerSeason + 1;
                        const endEp = Math.min(i * episodesPerSeason, totalEpisodes > 0 ? totalEpisodes : i * episodesPerSeason);
                        const epCount = totalEpisodes > 0 ? (endEp - startEp + 1) : episodesPerSeason;
                        
                        seasons.push({
                            id: `season-${i}`,
                            data_number: i,
                            title: `Season ${i}`,
                            link: null,
                            season_poster: null,
                            isSubOnly: false,
                            total_episodes: epCount,
                        });
                    }
                }
            }
        }

        return seasons;
    }

    /**
     * Estimate episode count for a season based on common patterns
     */
    estimateSeasonEpisodeCount($) {
        // Check for common episode counts
        const pageText = $('body').text();
        
        if (/24\s*episodes?/i.test(pageText)) return 24;
        if (/12\s*episodes?/i.test(pageText)) return 12;
        if (/13\s*episodes?/i.test(pageText)) return 13;
        if (/26\s*episodes?/i.test(pageText)) return 26;
        if (/52\s*episodes?/i.test(pageText)) return 52;
        
        // Default estimate
        return 12;
    }

    /**
     * Extract fallback seasons
     */
    extractFallbackSeasons($) {
        return [
            {
                id: 'season-1',
                data_number: 1,
                title: 'Season 1',
                link: null,
                season_poster: null,
                isSubOnly: false,
                total_episodes: 12,
            },
        ];
    }

    /**
     * Extract episode list with enhanced sub/dub differentiation
     * Returns episodes with isSubbed and isDubbed flags
     */
    extractEpisodesWithSubDub($, options = {}) {
        const episodes = [];
        const subbedEpisodes = new Set();
        const dubbedEpisodes = new Set();
        
        // First pass: identify which episodes are subbed vs dubbed
        const episodeSelectors = [
            SELECTORS.home.episodes,
            '.episode-list .episode',
            '.episodes .episode',
            '[class*="episode"] .episode',
            '.eps-nav .episode',
            '.episode-item',
            '.ep-item',
        ];
        
        for (const selector of episodeSelectors) {
            if ($(selector).length === 0) continue;
            
            $(selector).each((i, el) => {
                const $el = $(el);
                
                // Get the full text to check for sub/dub indicators
                const fullText = $el.text().toLowerCase();
                const link = $el.find('a').attr('href') || $el.attr('href') || '';
                
                // Extract episode number
                let epNum = null;
                const epMatch = fullText.match(/(?:ep|episode)[\s.]*(\d+)/i);
                if (epMatch) {
                    epNum = parseInt(epMatch[1]);
                } else {
                    // Try to extract from URL
                    const urlMatch = link.match(/episode[\s.-]*(\d+)/i);
                    if (urlMatch) {
                        epNum = parseInt(urlMatch[1]);
                    }
                }
                
                // Check for sub/dub indicators
                const isSubbed = /sub/i.test(fullText) || /subbed/i.test(fullText);
                const isDubbed = /dub/i.test(fullText) || /dubbed/i.test(fullText);
                
                // If we found an episode number, mark it
                if (epNum !== null) {
                    if (isSubbed) subbedEpisodes.add(epNum);
                    if (isDubbed) dubbedEpisodes.add(epNum);
                }
            });
            
            break; // Stop after first successful selector
        }
        
        // Second pass: extract full episode data
        for (const selector of episodeSelectors) {
            if ($(selector).length === 0) continue;
            
            $(selector).each((i, el) => {
                const $el = $(el);
                const link = $el.find('a').attr('href') || $el.attr('href') || '';
                
                if (!link || !link.includes('/episode/')) return;
                
                const epData = extractEpisodeFromUrl(link);
                const title = $el.find('.entry-title, .title, .ep-title').text().trim() ||
                             $el.find('a').attr('title') || '';
                const fullText = $el.text();
                
                if (epData) {
                    const epNum = epData.episode;
                    
                    // Determine if this is sub or dub
                    let isSubbed = /sub/i.test(fullText) || /subbed/i.test(fullText);
                    let isDubbed = /dub/i.test(fullText) || /dubbed/i.test(fullText);
                    
                    // If no explicit indicator, use our tracking sets
                    if (!isSubbed && !isDubbed) {
                        isSubbed = !dubbedEpisodes.has(epNum); // Default to sub if not explicitly dubbed
                    }
                    
                    // For special episodes (like 0, 1.5, etc.), handle appropriately
                    const isSpecial = epNum === 0 || epNum % 1 !== 0;
                    
                    episodes.push({
                        episode_no: epNum,
                        id: epData.formatted,
                        title: sanitizeText(title) || `Episode ${epNum}`,
                        link: normalizeUrl(link),
                        data_id: this.generateDataId(link),
                        isSubbed: isSubbed,
                        isDubbed: isDubbed,
                        isSpecial: isSpecial,
                    });
                }
            });
            
            break; // Stop after first successful selector
        }
        
        // Sort by episode number (descending for newest first)
        return episodes.sort((a, b) => b.episode_no - a.episode_no);
    }

    /**
     * Extract fallback episodes when primary extraction fails
     */
    extractFallbackEpisodes($) {
        const episodes = [];
        
        // Try to extract any episode links
        $('a[href*="/episode/"]').each((i, el) => {
            const link = $(el).attr('href');
            if (link) {
                const epData = extractEpisodeFromUrl(link);
                if (epData) {
                    const fullText = $(el).text();
                    const isSubbed = /sub/i.test(fullText);
                    const isDubbed = /dub/i.test(fullText);
                    
                    episodes.push({
                        episode_no: epData.episode,
                        id: epData.formatted,
                        title: sanitizeText(fullText) || `Episode ${epData.episode}`,
                        link: normalizeUrl(link),
                        data_id: this.generateDataId(link),
                        isSubbed: isSubbed || !isDubbed,
                        isDubbed: isDubbed,
                        isSpecial: epData.episode === 0,
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
     * Extract recommended anime with enhanced structure
     */
    async extractRecommended($) {
        const recommended = [];
        
        const recommendSelectors = [
            '.recommended .post',
            '.related .post',
            '[class*="recommend"] .post',
            '.suggestions .post',
            '.you-may-also-like .post',
            '.similar-anime .post',
            '[class*="similar"] .post',
        ];
        
        for (const selector of recommendSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                elements.each((i, el) => {
                    const link = $(el).find('a').attr('href');
                    const title = $(el).find('.entry-title, .title, h3, h4').text().trim();
                    const poster = getImageUrl($(el).find('img'));
                    
                    if (title && link) {
                        const type = link.includes('/movies/') ? 'Movie' : 
                                    link.includes('/cartoon/') ? 'Cartoon' : 'TV';
                        
                        recommended.push({
                            duration: '24 min',
                            data_id: this.generateDataId(link),
                            id: extractIdFromUrl(link),
                            title: sanitizeText(title),
                            poster: poster,
                            type: type,
                            tvInfo: {
                                showType: type,
                                duration: '24 min',
                            },
                        });
                    }
                });
                break;
            }
        }
        
        return [recommended];
    }

    /**
     * Extract fallback recommended data
     */
    extractFallbackRecommended() {
        return [[]];
    }

    /**
     * Extract fallback related data
     */
    extractFallbackRelated() {
        return [[]];
    }
}

module.exports = InfoExtractor;
