/**
 * Anime Salt API - Professional Anime Scraping API
 * Built with modular architecture inspired by itzzzme/anime-api
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const cache = require('./utils/cache');
const helpers = require('./utils/helpers');
const constants = require('./utils/constants');

// Import Extractors
const HomeExtractor = require('./extractors/homeExtractor');
const InfoExtractor = require('./extractors/infoExtractor');
const EpisodeExtractor = require('./extractors/episodeExtractor');
const StreamExtractor = require('./extractors/streamExtractor');
const SearchExtractor = require('./extractors/searchExtractor');
const MovieExtractor = require('./extractors/movieExtractor');
const CategoryExtractor = require('./extractors/categoryExtractor');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
}));
app.use(express.json());

// Rate limiter instance
const rateLimiter = new helpers.RateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
});

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        api: 'anime-salt-api',
        baseUrl: config.baseUrl,
        cache: cache.stats(),
    });
});

// ==================== HOME ENDPOINTS ====================

/**
 * GET /api/home
 * Get homepage data including spotlights, trending, top series, etc.
 */
app.get('/api/home', async (req, res) => {
    // Check cache
    const cacheKey = 'home';
    const cached = cache.get(cacheKey);
    if (cached && config.cache.enabled) {
        return res.json({
            success: true,
            cached: true,
            results: cached,
        });
    }

    // Rate limiting
    if (!rateLimiter.isAllowed(req.ip)) {
        return res.status(429).json({
            success: false,
            error: constants.ERRORS.RATE_LIMITED,
        });
    }

    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            // Cache the result (just the data, not the full response)
            cache.set(cacheKey, result.data);
            
            res.json({
                success: true,
                cached: false,
                results: result.data,
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Home Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== INFO ENDPOINTS ====================

/**
 * GET /api/info
 * Get detailed anime information
 */
app.get('/api/info', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    if (!helpers.validateAnimeId(id)) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.INVALID_ID,
        });
    }

    // Check cache
    const cacheKey = `info:${id}`;
    const cached = cache.get(cacheKey);
    if (cached && config.cache.enabled) {
        return res.json({
            success: true,
            cached: true,
            results: {
                data: cached,
            },
        });
    }

    try {
        const extractor = new InfoExtractor(config.baseUrl);
        const result = await extractor.extract(id);

        if (result.success) {
            cache.set(cacheKey, result.data);
            
            res.json({
                success: true,
                cached: false,
                results: {
                    data: result.data,
                },
            });
        } else {
            res.status(404).json({
                success: false,
                error: constants.ERRORS.NOT_FOUND,
            });
        }
    } catch (error) {
        console.error('[API] Info Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== EPISODE ENDPOINTS ====================

/**
 * GET /api/episodes
 * Get episode list for an anime
 */
app.get('/api/episodes', async (req, res) => {
    const { id, page, pageSize } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    const cacheKey = `episodes:${id}:${page || 1}`;
    const cached = cache.get(cacheKey);
    if (cached && config.cache.enabled) {
        return res.json({
            success: true,
            cached: true,
            results: cached,
        });
    }

    try {
        const extractor = new EpisodeExtractor(config.baseUrl);
        const pageNum = parseInt(page) || 1;
        const size = parseInt(pageSize) || 50;
        
        const result = await extractor.extractWithPagination(id, pageNum, size);

        if (result.success) {
            // Cache the result (just the data, not the full response)
            cache.set(cacheKey, result.data);
            
            res.json({
                success: true,
                cached: false,
                results: result.data,
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Episodes Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== STREAM ENDPOINTS ====================

/**
 * GET /api/stream
 * Get streaming links for an episode
 */
app.get('/api/stream', async (req, res) => {
    const { id, episode, server } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    // Stream links are not cached (dynamic content)
    try {
        const extractor = new StreamExtractor(config.baseUrl);
        const result = await extractor.extract(id, episode);

        if (result.success) {
            res.json({
                success: true,
                results: result.data,
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Stream Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/stream/fallback
 * Get fallback streaming links
 */
app.get('/api/stream/fallback', async (req, res) => {
    const { id, episode, server } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    try {
        const extractor = new StreamExtractor(config.baseUrl);
        const result = await extractor.extractFallback(id, episode, server);

        res.json({
            success: result.success,
            results: result.data || { error: result.error },
        });
    } catch (error) {
        console.error('[API] Stream Fallback Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/servers
 * Get available servers for an anime
 */
app.get('/api/servers', async (req, res) => {
    const { id, episode } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    try {
        const extractor = new StreamExtractor(config.baseUrl);
        const url = extractor.buildUrl(id, episode);
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const servers = await extractor.extractServers($);

        res.json({
            success: true,
            results: servers,
        });
    } catch (error) {
        console.error('[API] Servers Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== SEARCH ENDPOINTS ====================

/**
 * GET /api/search
 * Search for anime by keyword
 */
app.get('/api/search', async (req, res) => {
    const { keyword, q, page, pageSize } = req.query;
    const query = keyword || q;

    if (!query) {
        return res.status(400).json({
            success: false,
            error: 'Search keyword is required',
        });
    }

    // Search results are not cached
    try {
        const extractor = new SearchExtractor(config.baseUrl);
        const result = await extractor.search(query, {
            page: parseInt(page) || 1,
            pageSize: parseInt(pageSize) || 20,
        });

        res.json({
            success: result.success,
            results: result.data,
        });
    } catch (error) {
        console.error('[API] Search Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/search/suggest
 * Get search suggestions (autocomplete)
 */
app.get('/api/search/suggest', async (req, res) => {
    const { keyword, q, limit } = req.query;
    const query = keyword || q;

    if (!query || query.length < 2) {
        return res.json({
            success: true,
            results: [],
        });
    }

    try {
        const extractor = new SearchExtractor(config.baseUrl);
        const result = await extractor.getSuggestions(query, parseInt(limit) || 10);

        res.json({
            success: true,
            results: result.data,
        });
    } catch (error) {
        console.error('[API] Search Suggest Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/top-search
 * Get top search terms
 */
app.get('/api/top-search', async (req, res) => {
    try {
        const extractor = new SearchExtractor(config.baseUrl);
        const result = await extractor.getTopSearch(10);

        res.json({
            success: true,
            results: result.data,
        });
    } catch (error) {
        console.error('[API] Top Search Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== CATEGORY ENDPOINTS ====================

/**
 * GET /api/genres
 * Get list of all genres
 */
app.get('/api/genres', async (req, res) => {
    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            res.json({
                success: true,
                results: result.data.genres || [],
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Genres Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/networks
 * Get list of all networks/studios
 */
app.get('/api/networks', async (req, res) => {
    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            res.json({
                success: true,
                results: result.data.networks || [],
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Networks Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/languages
 * Get list of all available languages
 */
app.get('/api/languages', async (req, res) => {
    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            res.json({
                success: true,
                results: result.data.languages || [],
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Languages Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== MOVIE ENDPOINTS ====================

/**
 * GET /api/movie
 * Get movie details using dedicated movie extractor
 */
app.get('/api/movie', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    // Check cache
    const cacheKey = `movie:${id}`;
    const cached = cache.get(cacheKey);
    if (cached && config.cache.enabled) {
        return res.json({
            success: true,
            cached: true,
            results: {
                data: cached,
            },
        });
    }

    try {
        const extractor = new MovieExtractor(config.baseUrl);
        const result = await extractor.extract(id);

        if (result.success) {
            cache.set(cacheKey, result.data);
            
            res.json({
                success: true,
                cached: false,
                results: {
                    data: result.data,
                },
            });
        } else {
            res.status(404).json({
                success: false,
                error: constants.ERRORS.NOT_FOUND,
            });
        }
    } catch (error) {
        console.error('[API] Movie Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/movie/stream
 * Get movie streaming URL
 */
app.get('/api/movie/stream', async (req, res) => {
    const { id, server } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: constants.ERRORS.MISSING_ID,
        });
    }

    try {
        const extractor = new MovieExtractor(config.baseUrl);
        const result = await extractor.getStreamUrl(id, server);

        res.json({
            success: !!result,
            results: result || { error: 'No stream URL found' },
        });
    } catch (error) {
        console.error('[API] Movie Stream Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== CATEGORY ENDPOINTS ====================

/**
 * GET /api/category
 * Get items from a category page
 */
app.get('/api/category', async (req, res) => {
    const { type, value, page, pageSize } = req.query;

    if (!type || !value) {
        return res.status(400).json({
            success: false,
            error: 'Category type and value are required',
        });
    }

    try {
        const extractor = new CategoryExtractor(config.baseUrl);
        const result = await extractor.extract(type, value, {
            page: parseInt(page) || 1,
            pageSize: parseInt(pageSize) || 20,
        });

        res.json({
            success: result.success,
            results: result.data || { error: result.error },
        });
    } catch (error) {
        console.error('[API] Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/category/cartoon
 * Get cartoon category items
 */
app.get('/api/category/cartoon', async (req, res) => {
    const { page, pageSize } = req.query;

    try {
        const extractor = new CategoryExtractor(config.baseUrl);
        const result = await extractor.extractCartoons(
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );

        res.json({
            success: result.success,
            results: result.data || { error: result.error },
        });
    } catch (error) {
        console.error('[API] Cartoon Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/category/letter/:letter
 * Get items by first letter
 */
app.get('/api/category/letter/:letter', async (req, res) => {
    const { letter } = req.params;
    const { page, pageSize } = req.query;

    if (!letter || letter.length !== 1) {
        return res.status(400).json({
            success: false,
            error: 'Letter parameter is required',
        });
    }

    try {
        const extractor = new CategoryExtractor(config.baseUrl);
        const result = await extractor.extractLetter(
            letter.toUpperCase(),
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );

        res.json({
            success: result.success,
            results: result.data || { error: result.error },
        });
    } catch (error) {
        console.error('[API] Letter Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/categories
 * Get all available categories
 */
app.get('/api/categories', async (req, res) => {
    try {
        const extractor = new CategoryExtractor(config.baseUrl);
        const result = await extractor.getCategories();

        res.json({
            success: result.success,
            results: result.data || [],
        });
    } catch (error) {
        console.error('[API] Categories Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/letters
 * Get all available letters
 */
app.get('/api/letters', async (req, res) => {
    try {
        const extractor = new CategoryExtractor(config.baseUrl);
        const result = await extractor.getLetters();

        res.json({
            success: result.success,
            results: result.data || [],
        });
    } catch (error) {
        console.error('[API] Letters Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== TOP 10 ENDPOINT ====================

/**
 * GET /api/top-ten
 * Get top 10 anime by time period
 */
app.get('/api/top-ten', async (req, res) => {
    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            res.json({
                success: true,
                results: {
                    topTen: {
                        today: result.data.trending.slice(0, 10),
                        week: result.data.topSeries.slice(0, 10),
                        month: result.data.topSeries.slice(10, 20),
                    },
                },
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Top Ten Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== RANDOM ENDPOINT ====================

/**
 * GET /api/random
 * Get random anime info
 */
app.get('/api/random', async (req, res) => {
    try {
        const html = await helpers.fetchHTML(config.baseUrl);
        const $ = require('cheerio').load(html);

        const animeLinks = [];
        $('.post a.lnk-blk, .movies a[href*="/series/"], .movies a[href*="/movies/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('/series/') || href.includes('/movies/'))) {
                const id = href.split('/').filter(Boolean).pop();
                if (id && !animeLinks.includes(id)) {
                    animeLinks.push(id);
                }
            }
        });

        if (animeLinks.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No anime found',
            });
        }

        const randomId = animeLinks[Math.floor(Math.random() * animeLinks.length)];
        
        // Fetch random anime info
        const infoExtractor = new InfoExtractor(config.baseUrl);
        const infoResult = await infoExtractor.extract(randomId);

        if (infoResult.success) {
            res.json({
                success: true,
                results: {
                    data: infoResult.data,
                },
            });
        } else {
            res.status(404).json({
                success: false,
                error: constants.ERRORS.NOT_FOUND,
            });
        }
    } catch (error) {
        console.error('[API] Random Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== SCHEDULE ENDPOINT ====================

/**
 * GET /api/schedule
 * Get schedule of upcoming anime (based on recent episodes)
 */
app.get('/api/schedule', async (req, res) => {
    try {
        const extractor = new HomeExtractor(config.baseUrl);
        const result = await extractor.extract();

        if (result.success) {
            res.json({
                success: true,
                results: {
                    schedule: result.data.recentEpisodes.map(ep => ({
                        id: ep.id,
                        title: ep.title,
                        episode_no: parseInt(ep.episode) || 0,
                        releaseDate: new Date().toISOString().split('T')[0],
                        time: '00:00:00',
                    })),
                },
            });
        } else {
            res.json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('[API] Schedule Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== SERIES AND MOVIES LIST ENDPOINTS ====================

/**
 * GET /api/series
 * Get all series anime with pagination
 */
app.get('/api/series', async (req, res) => {
    const { page, pageSize } = req.query;
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;

    try {
        const url = `${config.baseUrl}/series/?page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() || 
                          $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.title').text().trim();
            const poster = helpers.getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            const year = $el.find('.year').text().trim();

            if (title && link) {
                results.push({
                    id: helpers.extractIdFromUrl(link),
                    title: helpers.sanitizeText(title),
                    poster: poster,
                    link: helpers.normalizeUrl(link),
                    quality: quality || 'HD',
                    year: year || '',
                    type: 'series',
                });
            }
        });

        res.json({
            success: true,
            results: {
                page: pageNum,
                pageSize: size,
                total: results.length,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Series Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/movies
 * Get all movies with pagination
 */
app.get('/api/movies', async (req, res) => {
    const { page, pageSize } = req.query;
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;

    try {
        const url = `${config.baseUrl}/movies/?page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() || 
                          $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.title').text().trim();
            const poster = helpers.getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();

            if (title && link) {
                results.push({
                    id: helpers.extractIdFromUrl(link),
                    title: helpers.sanitizeText(title),
                    poster: poster,
                    link: helpers.normalizeUrl(link),
                    quality: quality || 'HD',
                    type: 'movie',
                });
            }
        });

        res.json({
            success: true,
            results: {
                page: pageNum,
                pageSize: size,
                total: results.length,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Movies Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== CATEGORY FILTER ENDPOINTS ====================

/**
 * GET /api/category/ongoing
 * Get ongoing (on-air) anime series
 */
app.get('/api/category/ongoing', async (req, res) => {
    const { page, pageSize } = req.query;
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;

    try {
        const url = `${config.baseUrl}/category/status/ongoing/?page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() ||
                          $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.title').text().trim();
            const poster = helpers.getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            const year = $el.find('.year').text().trim();

            if (title && link) {
                results.push({
                    id: helpers.extractIdFromUrl(link),
                    title: helpers.sanitizeText(title),
                    poster: poster,
                    link: helpers.normalizeUrl(link),
                    quality: quality || 'HD',
                    year: year || '',
                    type: 'series',
                });
            }
        });

        res.json({
            success: true,
            results: {
                page: pageNum,
                pageSize: size,
                total: results.length,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Ongoing Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/category/anime
 * Get anime by type (series or movies) from /category/type/anime/?type={type}
 */
app.get('/api/category/anime', async (req, res) => {
    const { type, page, pageSize } = req.query;
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;

    // Validate type
    const validTypes = ['series', 'movies'];
    const animeType = validTypes.includes(type) ? type : 'series';

    try {
        const url = `${config.baseUrl}/category/type/anime/?type=${animeType}&page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() ||
                          $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.title').text().trim();
            const poster = helpers.getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            const year = $el.find('.year').text().trim();

            if (title && link) {
                results.push({
                    id: helpers.extractIdFromUrl(link),
                    title: helpers.sanitizeText(title),
                    poster: poster,
                    link: helpers.normalizeUrl(link),
                    quality: quality || 'HD',
                    year: year || '',
                    type: animeType,
                });
            }
        });

        res.json({
            success: true,
            results: {
                category: 'anime',
                type: animeType,
                page: pageNum,
                pageSize: size,
                total: results.length,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Anime Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/category/cartoon-type
 * Get cartoons by type (series or movies) from /category/type/cartoon/?type={type}
 */
app.get('/api/category/cartoon-type', async (req, res) => {
    const { type, page, pageSize } = req.query;
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;

    // Validate type
    const validTypes = ['series', 'movies'];
    const cartoonType = validTypes.includes(type) ? type : 'movies';

    try {
        const url = `${config.baseUrl}/category/type/cartoon/?type=${cartoonType}&page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() ||
                          $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.title').text().trim();
            const poster = helpers.getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            const year = $el.find('.year').text().trim();

            if (title && link) {
                results.push({
                    id: helpers.extractIdFromUrl(link),
                    title: helpers.sanitizeText(title),
                    poster: poster,
                    link: helpers.normalizeUrl(link),
                    quality: quality || 'HD',
                    year: year || '',
                    type: cartoonType,
                });
            }
        });

        res.json({
            success: true,
            results: {
                category: 'cartoon',
                type: cartoonType,
                page: pageNum,
                pageSize: size,
                total: results.length,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Cartoon Type Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/language/:lang
 * Get anime by language
 */
app.get('/api/language/:lang', async (req, res) => {
    const { lang } = req.params;
    const { page } = req.query;
    const pageNum = parseInt(page) || 1;

    try {
        const url = `${config.baseUrl}/category/language/${lang}/?page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post, .movies .tt').each((i, el) => {
            const anime = helpers.parseAnimeItem($(el));
            if (anime.id && anime.title) {
                results.push({
                    ...anime,
                    data_id: helpers.generateId(anime.id),
                    tvInfo: {
                        showType: anime.type || 'TV',
                        duration: '24 min',
                    },
                });
            }
        });

        res.json({
            success: true,
            results: {
                language: lang,
                page: pageNum,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Language Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

/**
 * GET /api/genre/:genre
 * Get anime by genre
 */
app.get('/api/genre/:genre', async (req, res) => {
    const { genre } = req.params;
    const { page } = req.query;
    const pageNum = parseInt(page) || 1;

    try {
        const url = `${config.baseUrl}/category/genre/${genre}/?page=${pageNum}`;
        const html = await helpers.fetchHTML(url);
        const $ = require('cheerio').load(html);

        const results = [];
        $('.post, .movies .tt').each((i, el) => {
            const anime = helpers.parseAnimeItem($(el));
            if (anime.id && anime.title) {
                results.push({
                    ...anime,
                    data_id: helpers.generateId(anime.id),
                    tvInfo: {
                        showType: anime.type || 'TV',
                        duration: '24 min',
                    },
                });
            }
        });

        res.json({
            success: true,
            results: {
                genre: genre,
                page: pageNum,
                data: results,
            },
        });
    } catch (error) {
        console.error('[API] Genre Error:', error.message);
        res.status(500).json({
            success: false,
            error: constants.ERRORS.SCRAPE_FAILED,
        });
    }
});

// ==================== ROOT ENDPOINT ====================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Anime Salt API v2.0.0',
        description: 'Professional Anime Scraping API for animesalt.cc',
        version: '2.0.0',
        author: 'MiniMax Agent',
        documentation: '/api',
        endpoints: {
            home: {
                'GET /api/home': 'Get homepage data (spotlights, trending, top series, etc.)',
                'GET /api/top-ten': 'Get top 10 anime by period',
            },
            info: {
                'GET /api/info?id={anime-id}': 'Get detailed anime information',
                'GET /api/random': 'Get random anime info',
            },
            episodes: {
                'GET /api/episodes?id={anime-id}': 'Get episode list',
            },
            stream: {
                'GET /api/stream?id={anime-id}&episode={ep}': 'Get streaming links',
                'GET /api/stream/fallback': 'Get fallback streaming links',
                'GET /api/servers': 'Get available servers',
            },
            movie: {
                'GET /api/movie?id={movie-id}': 'Get movie details',
                'GET /api/movie/stream?id={movie-id}&server={name}': 'Get movie stream URL',
            },
            search: {
                'GET /api/search?q={keyword}': 'Search anime',
                'GET /api/search/suggest?q={keyword}': 'Get search suggestions',
                'GET /api/top-search': 'Get top search terms',
            },
            categories: {
                'GET /api/series?page={num}': 'Get series anime',
                'GET /api/movies?page={num}': 'Get movie anime',
                'GET /api/category/cartoon?page={num}': 'Get cartoon category',
                'GET /api/category/letter/{A-Z}?page={num}': 'Get anime by letter',
                'GET /api/categories': 'Get all categories',
                'GET /api/letters': 'Get available letters',
                'GET /api/genres': 'Get all genres',
                'GET /api/networks': 'Get all networks',
                'GET /api/languages': 'Get all languages',
                'GET /api/language/{lang}?page={num}': 'Get anime by language',
                'GET /api/genre/{genre}?page={num}': 'Get anime by genre',
            },
            schedule: {
                'GET /api/schedule': 'Get upcoming schedule',
            },
            system: {
                'GET /api/health': 'Health check',
            },
        },
        exampleUsage: {
            home: 'curl /api/home',
            info: 'curl /api/info?id=naruto-shippuden',
            movie: 'curl /api/movie?id=the-loud-house-movie',
            cartoon: 'curl /api/category/cartoon?page=1',
            letter: 'curl /api/category/letter/A?page=1',
            episodes: 'curl /api/episodes?id=naruto-shippuden',
            stream: 'curl /api/stream?id=naruto-shippuden\&episode=1x1',
            search: 'curl /api/search?q=naruto',
        },
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[API] Global Error:', err.stack);
    res.status(500).json({
        success: false,
        error: constants.ERRORS.SERVER_ERROR,
    });
});

// ==================== SERVER STARTUP ====================

// Start cache cleanup interval (disabled in Vercel serverless environment)
// In serverless, setInterval won't persist across invocations
if (!process.env.VERCEL) {
    cache.startCleanupInterval(60000);
}

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('   Anime Salt API v2.0.0');
    console.log('========================================');
    console.log(`🌐 Server running at: http://${HOST}:${PORT}`);
    console.log(`📡 API Base URL: http://${HOST}:${PORT}/api`);
    console.log(`🎬 Target Site: ${config.baseUrl}`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   • GET /api/home - Homepage data`);
    console.log(`   • GET /api/info?id={id} - Anime details`);
    console.log(`   • GET /api/episodes?id={anime-id} - Episode list`);
    console.log(`   • GET /api/stream?id={id}&episode={ep} - Streaming links`);
    console.log(`   • GET /api/movie?id={movie-id} - Movie details`);
    console.log(`   • GET /api/movie/stream?id={movie-id} - Movie stream URL`);
    console.log(`   • GET /api/search?q={keyword} - Search anime`);
    console.log(`   • GET /api/series?page={num} - Series list`);
    console.log(`   • GET /api/movies?page={num} - Movies list`);
    console.log(`   • GET /api/category/cartoon?page={num} - Cartoon category`);
    console.log(`   • GET /api/category/letter/{A-Z}?page={num} - Letter listing`);
    console.log(`   • GET /api/category?type={type}&value={val} - Custom category`);
    console.log(`   • GET /api/categories - All categories`);
    console.log(`   • GET /api/letters - All available letters`);
    console.log(`   • GET /api/random - Random anime`);
    console.log(`   • GET /api/top-ten - Top 10 anime`);
    console.log(`   • GET /api/genres - All genres`);
    console.log(`   • GET /api/networks - All networks`);
    console.log(`   • GET /api/languages - All languages`);
    console.log(`   • GET /api/schedule - Upcoming schedule`);
    console.log(`   • GET /api/health - Server health`);
    console.log(`\n🛑 Press Ctrl+C to stop\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Server] Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
