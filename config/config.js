/**
 * Configuration for Anime Salt API
 * Centralized configuration management
 */

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 4000,
        host: process.env.HOST || '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
    },

    // Base URL Configuration
    baseUrl: 'https://animesalt.cc',
    
    // Request Configuration
    request: {
        timeout: 15000,
        retries: 3,
        retryDelay: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
    },

    // Cache Configuration
    cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
    },

    // Rate Limiting Configuration
    rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100, // 100 requests per window
    },

    // Response Configuration
    response: {
        maxPages: 10,
        defaultPageSize: 20,
        maxItemsPerSection: 50,
    },

    // Streaming Configuration
    streaming: {
        defaultServer: 'zephyrflick',
        maxQuality: 'auto',
        extractTracks: true,
        extractIntroOutro: true,
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined',
    },

    // CORS Configuration
    cors: {
        origin: '*',
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
};
