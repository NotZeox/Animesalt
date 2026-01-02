/**
 * Error Handler Middleware - Global error handling for the API
 */

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('[Error Handler]', err.message);
    console.error('[Error Stack]', err.stack);

    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body',
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request body too large',
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

/**
 * Not found handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            '/api/home',
            '/api/info',
            '/api/episodes',
            '/api/stream',
            '/api/movies',
            '/api/movies/:id',
            '/api/cartoon',
            '/api/search',
            '/api/genre/:genre',
            '/api/random',
        ],
    });
}

/**
 * Async handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });

    next();
}

/**
 * CORS middleware
 */
function corsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    requestLogger,
    corsMiddleware,
};
