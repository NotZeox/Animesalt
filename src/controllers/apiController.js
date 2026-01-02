/**
 * API Controller - Main controller for API endpoints
 */

const { AnimeParser, CartoonParser, MoviesParser } = require('../parsers');
const { fetchHTML } = require('../utils/request');
const { parseEpisodeFormat } = require('../utils/helpers');
const config = require('../config');

/**
 * API Controller class
 */
class ApiController {
    constructor() {
        this.animeParser = new AnimeParser();
        this.cartoonParser = new CartoonParser();
        this.moviesParser = new MoviesParser();
        this.cache = new Map();
    }

    /**
     * Get from cache
     */
    getFromCache(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < item.ttl) {
            return item.data;
        }
        return null;
    }

    /**
     * Set cache
     */
    setCache(key, data, ttl) {
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()).length,
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get home page data
     */
    async getHome() {
        const cacheKey = 'home';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const html = await fetchHTML(config.baseUrl);
            const $ = require('cheerio').load(html);

            const result = {
                success: true,
                spotlights: [],
                trending: [],
                topSeries: [],
                topMovies: [],
                freshDrops: [],
                upcomingEpisodes: [],
                networks: [],
                languages: [],
                genres: [],
                latestMovies: [],
                letters: [],
                stats: {
                    totalAnime: 0,
                    totalEpisodes: 0,
                    totalGenres: 0,
                },
            };

            // Extract networks
            $('#gs_logo_area_3 .gs_logo_single--wrapper a').each((i, el) => {
                const $el = $(el);
                const href = $el.attr('href');
                const img = $el.find('img').attr('data-src') || $el.find('img').attr('src');
                const name = $el.find('img').attr('alt') || $el.attr('title');

                if (href && name && !result.networks.find(n => n.id === href.split('/').pop())) {
                    result.networks.push({
                        id: href.split('/').pop() || name.toLowerCase().replace(/\s+/g, '-'),
                        name: name,
                        logo: this.normalizeUrl(img),
                        url: this.normalizeUrl(href),
                    });
                }
            });

            // Fallback networks
            if (result.networks.length === 0) {
                const networkNames = ['Disney Channel', 'Hungama TV', 'Sony YAY', 'Cartoon Network',
                    'Prime Video', 'Netflix', 'Hotstar', 'Crunchyroll'];
                networkNames.forEach((name) => {
                    result.networks.push({
                        id: name.toLowerCase().replace(/\s+/g, '-'),
                        name: name,
                    });
                });
            }

            // Extract genres
            const foundGenres = new Set();
            $('a[href*="/category/genre/"]').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();

                if (href && name) {
                    const genreId = href.split('/genre/')[1]?.toLowerCase();
                    if (genreId && config.validGenres.includes(genreId) && !foundGenres.has(genreId)) {
                        foundGenres.add(genreId);
                        result.genres.push({
                            id: genreId,
                            name: name.replace(/\b\w/g, l => l.toUpperCase()),
                            icon: this.getGenreIcon(genreId)
                        });
                    }
                }
            });

            // Ensure core genres
            const coreGenres = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'isekai',
                'martial-arts', 'mecha', 'romance', 'sci-fi', 'shounen', 'slice-of-life', 'sports', 'supernatural'];
            coreGenres.forEach(genreId => {
                if (!foundGenres.has(genreId)) {
                    foundGenres.add(genreId);
                    result.genres.push({
                        id: genreId,
                        name: genreId.replace(/\b\w/g, l => l.toUpperCase()),
                        icon: this.getGenreIcon(genreId)
                    });
                }
            });

            result.genres = result.genres.slice(0, 25);

            // Extract trending (simplified)
            let seriesCount = 0;
            let movieCount = 0;
            const maxSeries = 10;
            const maxMovies = 5;

            $('article.post, li.post, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));
                if (!item) return;

                if (item.type === 'MOVIE') {
                    if (movieCount < maxMovies && !result.trending.find(t => t.id === item.id)) {
                        result.trending.push(item);
                        movieCount++;
                    }
                } else {
                    if (seriesCount < maxSeries && !result.trending.find(t => t.id === item.id)) {
                        result.trending.push(item);
                        seriesCount++;
                    }
                }
            });

            this.setCache(cacheKey, result, config.cache.home);
            return result;
        } catch (error) {
            console.error('[Controller] Error getting home:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get anime info
     */
    async getInfo(id) {
        return this.animeParser.getInfo(id);
    }

    /**
     * Get anime episodes
     */
    async getEpisodes(id) {
        return this.animeParser.getEpisodes(id);
    }

    /**
     * Get stream links
     * @param {string} episodeId - Episode ID
     * @param {string} lang - Preferred language (default: 'hindi')
     * @returns {object} - Stream data
     */
    async getStream(episodeId, lang = 'hindi') {
        return this.animeParser.getStream(episodeId, lang);
    }

    /**
     * Get movies list
     */
    async getMovies(page = 1, pageSize = 20) {
        return this.moviesParser.getMovies(page, pageSize);
    }

    /**
     * Get movie info
     */
    async getMovieInfo(id) {
        return this.moviesParser.getInfo(id);
    }

    /**
     * Get cartoons
     */
    async getCartoons(type = 'series', subCategory = null, page = 1) {
        return this.cartoonParser.extractCartoons(type, subCategory, page);
    }

    /**
     * Search anime
     */
    async search(query, page = 1, pageSize = 20) {
        try {
            const searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
            const html = await fetchHTML(searchUrl);
            const $ = require('cheerio').load(html);

            const results = [];
            const seenIds = new Set();

            $('article.post:has(a[href*="/series/"]), article.post:has(a[href*="/movies/"])').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    results.push(item);
                }
            });

            // Pagination
            const startIndex = (page - 1) * pageSize;
            const paginatedResults = results.slice(startIndex, startIndex + pageSize);

            return {
                success: true,
                query: query,
                total: results.length,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(results.length / pageSize),
                results: paginatedResults,
            };
        } catch (error) {
            console.error('[Controller] Error searching:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get genre anime
     */
    async getGenre(genre, page = 1, pageSize = 20) {
        try {
            const url = `${config.baseUrl}/category/genre/${genre}${page > 1 ? `/page/${page}` : ''}`;
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const items = [];
            const seenIds = new Set();

            $('article.post, li.post').each((i, el) => {
                const item = this.parseAnimeItem($, $(el));
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    items.push(item);
                }
            });

            return {
                success: true,
                genre: genre,
                page: page,
                pageSize: pageSize,
                total: items.length,
                items: items,
            };
        } catch (error) {
            console.error('[Controller] Error getting genre:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get random anime
     */
    async getRandom() {
        const home = await this.getHome();
        if (home.trending && home.trending.length > 0) {
            const randomIndex = Math.floor(Math.random() * home.trending.length);
            const item = home.trending[randomIndex];
            return {
                success: true,
                anime: item,
            };
        }
        return { success: false, error: 'No anime found' };
    }

    // Helper methods (should be in utils, duplicated here for simplicity)
    normalizeUrl(url) {
        if (!url) return null;
        if (typeof url !== 'string') return null;
        url = url.trim();
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return config.baseUrl + url;
        if (!url.startsWith('http') && url.includes('animesalt.cc')) return 'https://' + url;
        return url;
    }

    getGenreIcon(genreId) {
        return config.genreIcons[genreId?.toLowerCase()] || '🎬';
    }

    parseAnimeItem($, $el) {
        const link = $el.find('a.lnk-blk').attr('href') ||
            $el.find('a[href*="/series/"]').attr('href') ||
            $el.find('a[href*="/movies/"]').attr('href');

        const title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim() ||
            $el.find('.Title, .entry-title, .title').text().trim() ||
            $el.text().substring(0, 100).trim();

        const poster = $el.find('img').attr('data-src') ||
            $el.find('img').attr('src') ||
            $el.find('img').attr('data-lazy-src');

        if (!link || !title) return null;

        const epInfo = parseEpisodeFormat($el.text());
        const epMatch = $el.text().match(/EP[:\s]*(\d+)/i);
        const isCartoon = title.toLowerCase().includes('cartoon') || link.includes('/cartoon/');

        let subCategory = 'TV Series';
        const pageText = $el.text().toLowerCase();
        if (title.toLowerCase().includes('movie') || link.includes('/movies/')) {
            subCategory = 'Movie';
        } else if (pageText.includes('ova') || pageText.includes('OAD')) {
            subCategory = 'OVA/Special';
        }

        const { extractIdFromUrl } = require('../utils/helpers');
        return {
            id: extractIdFromUrl(link),
            title: title,
            poster: this.normalizeUrl(poster),
            url: this.normalizeUrl(link),
            latestEpisode: epMatch ? epMatch[1] : null,
            season: epInfo.season,
            episode: epInfo.episode,
            episodeLabel: epInfo.episode ? `${epInfo.season}xEP:${epInfo.episode}` : null,
            type: link.includes('/movies/') ? 'MOVIE' : (isCartoon ? 'CARTOON' : 'SERIES'),
            isCartoon: isCartoon,
            subCategory: subCategory,
        };
    }
}

module.exports = ApiController;
