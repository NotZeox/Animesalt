/**
 * Error Handler Middleware - Standardized error handling for the API
 * Provides consistent error responses across all endpoints
 */

const config = require('../config');

/**
 * API Error class for structured error handling
 */
class ApiError extends Error {
    constructor(statusCode, message, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error codes for programmatic error handling
 */
const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    TIMEOUT: 'TIMEOUT',
    SCRAPING_ERROR: 'SCRAPING_ERROR',
    INVALID_ID: 'INVALID_ID',
    MISSING_PARAM: 'MISSING_PARAM',
};

/**
 * Create standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} errorCode - Error code for programmatic handling
 * @param {string} details - Additional error details (dev only)
 */
function createErrorResponse(res, statusCode, message, errorCode = null, details = null) {
    const isDev = config.server.env === 'development';
    
    const response = {
        success: false,
        statusCode: statusCode,
        message: message,
    };
    
    if (errorCode) {
        response.errorCode = errorCode;
    }
    
    if (isDev && details) {
        response.details = details;
    }
    
    return res.status(statusCode).json(response);
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    // Log the error
    console.error('[Error Handler]', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    });

    // Handle known API errors
    if (err instanceof ApiError) {
        return createErrorResponse(
            res,
            err.statusCode,
            err.message,
            err.errorCode,
            err.stack
        );
    }

    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        return createErrorResponse(
            res,
            400,
            'Invalid JSON in request body',
            ErrorCodes.VALIDATION_ERROR
        );
    }

    if (err.type === 'entity.too.large') {
        return createErrorResponse(
            res,
            413,
            'Request body too large',
            ErrorCodes.VALIDATION_ERROR
        );
    }

    // Handle Axios errors (network/scraping errors)
    if (err.code === 'ECONNREFUSED') {
        return createErrorResponse(
            res,
            503,
            'Unable to connect to target server',
            ErrorCodes.SCRAPING_ERROR,
            'Connection refused. The target server may be down.'
        );
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        return createErrorResponse(
            res,
            504,
            'Request timeout',
            ErrorCodes.TIMEOUT,
            'The request to the target server timed out.'
        );
    }

    if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        
        if (status === 404) {
            return createErrorResponse(
                res,
                404,
                'Resource not found',
                ErrorCodes.NOT_FOUND,
                `The requested resource was not found on the target server.`
            );
        }
        
        if (status === 429) {
            return createErrorResponse(
                res,
                429,
                'Rate limit exceeded',
                ErrorCodes.RATE_LIMIT,
                'Too many requests to the target server.'
            );
        }
        
        if (status >= 500) {
            return createErrorResponse(
                res,
                502,
                'Target server error',
                ErrorCodes.SERVER_ERROR,
                `The target server returned an error: ${status}`
            );
        }
    }

    // Default error response
    const isDev = config.server.env === 'development';
    return createErrorResponse(
        res,
        err.status || 500,
        isDev ? err.message : 'Internal server error',
        ErrorCodes.SERVER_ERROR,
        isDev ? err.stack : undefined
    );
}

/**
 * Not found handler
 */
function notFoundHandler(req, res) {
    createErrorResponse(
        res,
        404,
        `Endpoint not found: ${req.method} ${req.originalUrl}`,
        ErrorCodes.NOT_FOUND,
        `The requested endpoint does not exist.`
    );
}

/**
 * Async handler wrapper with improved error handling
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validation error handler middleware
 */
function handleValidationErrors(validationResult, res) {
    if (!validationResult.isValid) {
        createErrorResponse(
            res,
            400,
            validationResult.error,
            ErrorCodes.VALIDATION_ERROR
        );
        return true;
    }
    return false;
}

/**
 * Request logger middleware with improved formatting
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent') || 'unknown',
        };
        
        // Color coding based on status
        if (res.statusCode >= 500) {
            console.error('[Request]', JSON.stringify(logEntry));
        } else if (res.statusCode >= 400) {
            console.warn('[Request]', JSON.stringify(logEntry));
        } else {
            console.log('[Request]', JSON.stringify(logEntry));
        }
    });
    
    next();
}

/**
 * CORS middleware with improved headers
 */
function corsMiddleware(req, res, next) {
    // Get CORS config or use defaults
    const corsConfig = config.cors || {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    };
    
    res.setHeader('Access-Control-Allow-Origin', corsConfig.origin);
    res.setHeader('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    
    next();
}

/**
 * Success response helper
 * @param {object} res - Express response object
 * @param {object} data - Data to send
 * @param {number} statusCode - HTTP status code (default 200)
 */
function sendSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        statusCode: statusCode,
        data: data,
    });
}

/**
 * Create a not found error
 */
function notFoundError(message = 'Resource not found') {
    return new ApiError(404, message, ErrorCodes.NOT_FOUND);
}

/**
 * Create a validation error
 */
function validationError(message) {
    return new ApiError(400, message, ErrorCodes.VALIDATION_ERROR);
}

/**
 * Create a server error
 */
function serverError(message, details = null) {
    const error = new ApiError(500, message, ErrorCodes.SERVER_ERROR);
    if (details) {
        error.details = details;
    }
    return error;
}

module.exports = {
    ApiError,
    ErrorCodes,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    handleValidationErrors,
    requestLogger,
    corsMiddleware,
    sendSuccess,
    notFoundError,
    validationError,
    serverError,
    createErrorResponse,
};
