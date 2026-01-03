/**
 * API Routes - Define all API endpoints with standardized error handling
 */

const express = require('express');
const ApiController = require('../controllers/apiController');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const config = require('../../config/config');

/**
 * Create API router
 */
function createApiRouter() {
    const router = express.Router();
    const controller = new ApiController();

    // Health check
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '5.0.0',
            cacheStats: controller.getCacheStats(),
        });
    });

    // Home page - uses HomeParser for comprehensive extraction
    router.get('/home', asyncHandler(async (req, res) => {
        const result = await controller.getHome();
        res.json(result);
    }));

    // Info endpoint with validation
    router.get('/info', asyncHandler(async (req, res) => {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                statusCode: 400,
                error: 'ID parameter required',
                errorCode: 'MISSING_PARAM'
            });
        }
        const result = await controller.getInfo(id);
        res.json(result);
    }));

    // Episodes endpoint with validation
    router.get('/episodes', asyncHandler(async (req, res) => {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                statusCode: 400,
                error: 'ID parameter required',
                errorCode: 'MISSING_PARAM'
            });
        }
        const result = await controller.getEpisodes(id);
        res.json(result);
    }));

    // Stream endpoint with validation
    router.get('/stream', asyncHandler(async (req, res) => {
        let { id, episode, lang } = req.query;

        if (!id) {
            return res.status(400).json({ 
                success: false, 
                statusCode: 400,
                error: 'ID parameter required',
                errorCode: 'MISSING_PARAM'
            });
        }

        // Clean up ID
        if (id.includes('?')) {
            id = id.split('?')[0];
        }

        // Build episode ID
        let episodeId;
        if (episode) {
            if (episode.includes('?')) {
                episode = episode.split('?')[0];
            }
            const epMatch = episode.match(/(\d+)x(\d+)/i);
            if (epMatch) {
                episodeId = `${id}-${episode}`;
            } else {
                episodeId = `${id}-1x${episode}`;
            }
        } else {
            episodeId = `${id}-1x1`;
        }

        // Default language is Hindi if not specified
        const preferredLang = (lang || 'hindi').toLowerCase();

        const result = await controller.getStream(episodeId, preferredLang);
        res.json(result);
    }));

    // Movies endpoints with validation
    router.get('/movies', asyncHandler(async (req, res) => {
        const { page, pageSize } = req.query;
        const result = await controller.getMovies(
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    router.get('/movies/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await controller.getMovieInfo(id);
        res.json(result);
    }));

    // Cartoon endpoints with validation
    router.get('/cartoon', asyncHandler(async (req, res) => {
        const { type, subCategory, page } = req.query;
        const result = await controller.getCartoons(
            type || 'series',
            subCategory || null,
            parseInt(page) || 1
        );
        res.json(result);
    }));

    // Search endpoint with validation and sanitization
    router.get('/search', asyncHandler(async (req, res) => {
        const { keyword, q, page, pageSize } = req.query;
        const query = keyword || q;
        if (!query) {
            return res.status(400).json({ 
                success: false, 
                statusCode: 400,
                error: 'Search keyword required',
                errorCode: 'MISSING_PARAM'
            });
        }
        const result = await controller.search(
            query,
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    // Genre endpoint with validation
    router.get('/genre/:genre', asyncHandler(async (req, res) => {
        const { genre } = req.params;
        const { page, pageSize } = req.query;
        const result = await controller.getGenre(
            genre,
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    // Letter endpoint - properly implemented to fetch content by letter
    router.get('/letter/:letter', asyncHandler(async (req, res) => {
        const { letter } = req.params;
        const { page, pageSize } = req.query;
        const result = await controller.getLetterContent(
            letter,
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    // Random endpoint
    router.get('/random', asyncHandler(async (req, res) => {
        const result = await controller.getRandom();
        res.json(result);
    }));

    // Additional endpoints - fixed to use proper response structure
    router.get('/top-ten', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        if (!home.success) {
            return res.json({
                success: false,
                error: home.error || 'Failed to fetch home data'
            });
        }
        res.json({
            success: true,
            statusCode: 200,
            data: {
                series: (home.trending || []).filter(t => t.type === 'SERIES').slice(0, 10),
                movies: (home.movies || []).slice(0, 10),
            },
        });
    }));

    router.get('/schedule', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        if (!home.success) {
            return res.json({
                success: false,
                error: home.error || 'Failed to fetch home data'
            });
        }
        res.json({
            success: true,
            statusCode: 200,
            data: {
                upcoming: home.upcomingEpisodes || [],
            },
        });
    }));

    router.get('/servers', asyncHandler(async (req, res) => {
        const { id, episode, lang } = req.query;
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                statusCode: 400,
                error: 'ID parameter required',
                errorCode: 'MISSING_PARAM'
            });
        }
        const episodeId = episode ? `${id}-episode-${episode}` : `${id}-episode-1`;
        const preferredLang = (lang || 'hindi').toLowerCase();
        const result = await controller.getStream(episodeId, preferredLang);
        res.json({
            success: true,
            statusCode: 200,
            data: {
                episodeId: episodeId,
                language: result.language,
                sources: result.sources,
                downloadLinks: result.downloadLinks,
            },
        });
    }));

    router.get('/categories', (req, res) => {
        res.json({
            success: true,
            statusCode: 200,
            data: {
                categories: ['series', 'movies', 'ongoing', 'genres', 'networks', 'languages', 'cartoon'],
                subCategories: {
                    cartoons: ['Series', 'Movies', 'Shorts', 'Specials', 'Crossovers'],
                    genres: config.validGenres,
                },
            },
        });
    });

    router.get('/genres', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        res.json({
            success: true,
            statusCode: 200,
            data: {
                genres: home.genres || [],
                validGenres: config.validGenres,
            },
        });
    }));

    router.get('/networks', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        res.json({
            success: true,
            statusCode: 200,
            data: {
                networks: home.networks || [],
            },
        });
    }));

    router.get('/languages', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        res.json({
            success: true,
            statusCode: 200,
            data: {
                languages: home.languages || [],
            },
        });
    }));

    router.get('/letters', asyncHandler(async (req, res) => {
        const home = await controller.getHome();
        res.json({
            success: true,
            statusCode: 200,
            data: {
                letters: home.letters || [],
            },
        });
    }));

    router.get('/series', asyncHandler(async (req, res) => {
        const { page, pageSize } = req.query;
        const result = await controller.getGenre(
            'series',
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    router.get('/ongoing', asyncHandler(async (req, res) => {
        const { page, pageSize } = req.query;
        const result = await controller.getGenre(
            'ongoing',
            parseInt(page) || 1,
            parseInt(pageSize) || 20
        );
        res.json(result);
    }));

    // Test endpoint - connectivity check
    router.get('/test', asyncHandler(async (req, res) => {
        try {
            const { fetchHTML } = require('../utils/request');
            await fetchHTML(config.baseUrl);
            res.json({
                success: true,
                statusCode: 200,
                data: {
                    message: 'Successfully connected to animesalt.cc',
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                statusCode: 500,
                error: 'Failed to connect to animesalt.cc',
                errorCode: 'SCRAPING_ERROR',
                details: error.message,
            });
        }
    }));

    // Test links endpoint - sample API testing
    router.get('/test-links', asyncHandler(async (req, res) => {
        const { sampleSize } = req.query;
        const testSize = Math.min(parseInt(sampleSize) || 50, 100);

        const testIds = [
            'naruto-shippuden', 'one-piece', 'dragon-ball-super', 'attack-on-titan',
            'demon-slayer', 'my-hero-academia', 'jujutsu-kaisen', 'solo-leveling',
            'spy-x-family', 'frieren-beyond-journeys-end', 'blue-lock', 'chainsaw-man',
        ];

        const results = {
            tested: 0,
            passed: 0,
            failed: 0,
            results: [],
            errors: [],
        };

        const testIdsSampled = testIds.slice(0, testSize);

        for (const id of testIdsSampled) {
            results.tested++;
            try {
                const info = await controller.getInfo(id);
                if (info.success) {
                    results.passed++;
                    results.results.push({
                        id: id,
                        status: 'PASSED',
                        type: info.type,
                        title: info.title,
                    });
                } else {
                    results.failed++;
                    results.errors.push({ id, error: info.error });
                    results.results.push({
                        id: id,
                        status: 'FAILED',
                        error: info.error,
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
                results.results.push({
                    id: id,
                    status: 'ERROR',
                    error: error.message,
                });
            }
        }

        res.json({
            success: true,
            statusCode: 200,
            data: {
                summary: {
                    tested: results.tested,
                    passed: results.passed,
                    failed: results.failed,
                    successRate: results.tested > 0 ? ((results.passed / results.tested) * 100).toFixed(2) + '%' : '0%',
                },
                results: results.results,
                errors: results.errors.slice(0, 10),
            },
        });
    }));

    return router;
}

module.exports = createApiRouter;
