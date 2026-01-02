/**
 * Simplified Home Page Extractor for Anime Salt API
 * Produces a clean, flat structure optimized for frontend consumption
 * 
 * Target Response Structure:
 * {
 *   "success": true,
 *   "meta": { "source", "timestamp", "itemCount" },
 *   "featured": [...],
 *   "trending": [...],
 *   "latest": [...],
 *   "topRated": [...],
 *   "ongoing": [...],
 *   "movies": [...],
 *   "series": [...],
 *   "recentEpisodes": [...],
 *   "animeList": [...],
 *   "filters": { "genres", "languages", "letters", "networks" }
 * }
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, sanitizeText, delay } = require('../utils/helpers');

class HomeExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.maxRetries = 3;
        this.requestDelay = 1000;
    }

    /**
     * Extract all homepage data with simplified structure
     */
    async extract() {
        const startTime = Date.now();
        const globalItems = new Map(); // For deduplication

        try {
            const html = await this.fetchWithRetry(this.baseUrl);
            const $ = require('cheerio').load(html);

            // Extract all sections
            const featured = this.extractFeatured($);
            const trending = this.extractTrending($);
            const latest = this.extractLatest($);
            const topRated = this.extractTopRated($);
            const ongoing = this.extractOngoing($);
            const movies = this.extractMovies($);
            const series = this.extractSeries($);
            const recentEpisodes = this.extractRecentEpisodes($);

            // Collect all items for the master list and deduplicate
            const allSections = [featured, trending, latest, topRated, ongoing, movies, series, recentEpisodes];
            
            for (const section of allSections) {
                for (const item of section) {
                    if (item.id && !globalItems.has(item.id)) {
                        globalItems.set(item.id, item);
                    }
                }
            }

            // Build animeList from deduplicated items
            const animeList = Array.from(globalItems.values());

            // Extract filters
            const filters = {
                genres: this.extractGenreList($),
                languages: this.extractLanguageList($),
                letters: this.extractLetterList($),
                networks: this.extractNetworkList($),
            };

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                meta: {
                    source: 'animesalt.cc',
                    timestamp: new Date().toISOString(),
                    itemCount: animeList.length,
                    processingTime: `${processingTime}ms`,
                },
                featured: featured.slice(0, 10),
                trending: trending.slice(0, 10),
                latest: latest.slice(0, 20),
                topRated: topRated.slice(0, 20),
                ongoing: ongoing.slice(0, 20),
                movies: movies.slice(0, 50),
                series: series.slice(0, 100),
                recentEpisodes: recentEpisodes.slice(0, 30),
                animeList: animeList,
                filters: filters,
            };
        } catch (error) {
            console.error('[HomeExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Fetch HTML with retry logic
     */
    async fetchWithRetry(url, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const html = await fetchHTML(url);
                if (html && html.length > 100) {
                    return html;
                }
                throw new Error('Empty or invalid response');
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                await delay(attempt * this.requestDelay);
            }
        }
    }

    /**
     * Extract featured/spotlight anime
     */
    extractFeatured($) {
        const items = [];
        
        // Try to find carousel/slider section
        const carouselSection = $('.swiper-slide, .hero-slider, .featured-slider, .spotlight-carousel, .swipecarousel');
        
        if (carouselSection.length > 0) {
            carouselSection.find('.post, .slide, .item').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        // Fallback: extract from popular posts
        if (items.length === 0) {
            $('article.post, .post, .movies .tt').each((i, el) => {
                if (items.length >= 10) return false;
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract trending anime (Top 10)
     */
    extractTrending($) {
        const items = [];
        
        // Look for Most-Watched/Popular sections
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('trending') || title.includes('most-watch') || title.includes('popular')) {
                section = $(this);
                return false;
            }
        });

        if (section.length > 0) {
            section.find('.post, .chart-item, .movies .tt').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        // Fallback
        if (items.length === 0) {
            $('article.post, .post, .movies .tt').each((i, el) => {
                if (items.length >= 10) return false;
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract latest anime updates
     */
    extractLatest($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('latest') || title.includes('recent')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        // Fallback
        if (items.length === 0) {
            $('article.post, .post').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract top rated anime
     */
    extractTopRated($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('top') && (title.includes('rated') || title.includes('rating'))) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .chart-item, .movies .tt').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        return items;
    }

    /**
     * Extract ongoing/airing anime
     */
    extractOngoing($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('on-air') || title.includes('airing') || title.includes('currently')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .swiper-slide .post').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        return items;
    }

    /**
     * Extract movies only
     */
    extractMovies($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('movie')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .chart-item').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item && item.type === 'movie') items.push(item);
        });

        // Fallback: filter by /movies/ links
        if (items.length === 0) {
            $('a[href*="/movies/"]').closest('.post, article.post, .movies .tt').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract series only
     */
    extractSeries($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('series') && !title.includes('movie')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .chart-item').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item && item.type === 'series') items.push(item);
        });

        // Fallback: filter by /series/ links
        if (items.length === 0) {
            $('a[href*="/series/"]').closest('.post, article.post, .movies .tt').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract recent episodes
     */
    extractRecentEpisodes($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().toLowerCase();
            if (title.includes('recent') && (title.includes('episode') || title.includes('update'))) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        return items;
    }

    /**
     * Parse anime item with standardized structure
     */
    parseAnimeItem($el) {
        // Find link
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title
        let title = $el.find('.chart-title, .entry-title, .title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster
        const poster = this.extractPoster($el);

        // Determine type
        const type = link.includes('/movies/') ? 'movie' : 'series';

        // Extract episode info
        const episodeText = $el.find('.year, .episode, .ep-info').text().trim();
        const nextEpisode = episodeText.match(/EP:?\s*(\d+[-/]?\d*)/i)?.[1] || null;

        // Extract year
        const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        // Extract quality
        let quality = 'HD';
        const textLower = $el.text().toLowerCase();
        if (textLower.includes('1080p')) quality = '1080p';
        else if (textLower.includes('720p')) quality = '720p';
        else if (textLower.includes('480p')) quality = '480p';

        // Extract rating if available
        const ratingMatch = $el.text().match(/(\d+\.?\d*)\s*\/\s*10|rating[:\s]*(\d+\.?\d*)/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1] || ratingMatch[2]) : null;

        // Determine status
        let status = 'completed';
        if ($el.text().toLowerCase().includes('airing') || 
            $el.text().toLowerCase().includes('ongoing') ||
            $el.find('.countdown-timer').length > 0) {
            status = 'ongoing';
        }

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: poster,
            type: type,
            year: year,
            status: status,
            lastEpisode: nextEpisode,
            rating: rating,
            quality: quality,
            link: normalizeUrl(link),
        };
    }

    /**
     * Extract poster image with lazy loading support
     */
    extractPoster($el) {
        const imgEl = $el.find('img').first();
        
        let src = imgEl.attr('data-src') || imgEl.attr('data-lazy-src');
        if (src) return this.fixImageUrl(src);
        
        src = imgEl.attr('src');
        if (src) return this.fixImageUrl(src);
        
        const posterStyle = $el.find('[style*="background"], [style*="poster"]').attr('style');
        if (posterStyle) {
            const match = posterStyle.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (match) return this.fixImageUrl(match[1]);
        }
        
        return '';
    }

    /**
     * Fix image URLs
     */
    fixImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('//')) return 'https:' + url;
        if (!url.startsWith('http')) return 'https://' + url;
        return url;
    }

    /**
     * Generate ID from title
     */
    generateId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Extract genre list for filters
     */
    extractGenreList($) {
        const genres = new Set();
        
        $('a[href*="/category/genre/"]').each((i, el) => {
            const name = $(el).text().trim();
            if (name) genres.add(name);
        });

        // Add common genres if none found
        if (genres.size === 0) {
            const commonGenres = [
                'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
                'Horror', 'Isekai', 'Romance', 'Sci-Fi', 'Supernatural',
                'Martial Arts', 'Mecha', 'Psychological', 'School', 'Shounen',
                'Slice of Life', 'Sports', 'Thriller', 'Ecchi', 'Music'
            ];
            commonGenres.forEach(g => genres.add(g));
        }

        return Array.from(genres).sort();
    }

    /**
     * Extract language list for filters
     */
    extractLanguageList($) {
        const languages = new Set();
        
        $('a[href*="/category/language/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim();
            
            if (link.includes('/language/')) {
                const lang = link.split('/language/')[1]?.replace(/\//g, '') || name;
                if (lang) languages.add(lang.charAt(0).toUpperCase() + lang.slice(1));
            }
            if (name) languages.add(name);
        });

        // Common languages from animesalt.cc
        if (languages.size === 0) {
            const commonLangs = [
                'English', 'Hindi', 'Japanese', 'Tamil', 'Telugu', 
                'Bengali', 'Malayalam', 'Kannada', 'Korean', 'Chinese'
            ];
            commonLangs.forEach(l => languages.add(l));
        }

        return Array.from(languages).sort();
    }

    /**
     * Extract letter list for A-Z navigation
     */
    extractLetterList($) {
        const letters = new Set();
        
        $('a[href*="/letter/"]').each((i, el) => {
            const letter = $(el).text().trim();
            if (letter) letters.add(letter);
        });

        // Add default letters if none found
        if (letters.size === 0) {
            '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => letters.add(l));
        }

        return Array.from(letters);
    }

    /**
     * Extract network list for filters
     */
    extractNetworkList($) {
        const networks = new Set();
        
        $('a[href*="/category/network/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim() || $(el).find('img').attr('title') || '';
            
            if (link.includes('/network/')) {
                const network = link.split('/network/')[1]?.replace(/\//g, '') || name;
                if (network) {
                    networks.add(network.charAt(0).toUpperCase() + network.slice(1));
                }
            }
            if (name) networks.add(name);
        });

        // Common networks
        if (networks.size === 0) {
            const commonNetworks = [
                'Crunchyroll', 'Netflix', 'Disney+', 'Prime Video', 
                'Cartoon Network', 'HBO', 'Hulu'
            ];
            commonNetworks.forEach(n => networks.add(n));
        }

        return Array.from(networks).sort();
    }
}

module.exports = HomeExtractor;
