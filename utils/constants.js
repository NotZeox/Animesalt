/**
 * Constants for Anime Salt API
 * Site-specific constants and mappings
 */

// Site base URLs
const SITES = {
    ANIME_SALT: {
        base: 'https://animesalt.cc',
        name: 'Anime Salt',
    },
};

// Anime types
const SHOW_TYPES = {
    TV: 'TV',
    MOVIE: 'Movie',
    OVA: 'OVA',
    ONA: 'ONA',
    SPECIAL: 'Special',
    MUSIC: 'Music',
};

// Quality options
const QUALITY = {
    HD: 'HD',
    FHD: 'Full HD',
    SD: 'SD',
};

// Language mappings
const LANGUAGES = {
    hindi: 'Hindi',
    tamil: 'Tamil',
    telugu: 'Telugu',
    bengali: 'Bengali',
    malayalam: 'Malayalam',
    kannada: 'Kannada',
    english: 'English',
    japanese: 'Japanese',
    korean: 'Korean',
};

// Common genres
const GENRES = [
    'Action',
    'Adventure',
    'Cars',
    'Comedy',
    'Dementia',
    'Demons',
    'Drama',
    'Ecchi',
    'Fantasy',
    'Game',
    'Harem',
    'Historical',
    'Horror',
    'Josei',
    'Kids',
    'Magic',
    'Martial Arts',
    'Mecha',
    'Military',
    'Music',
    'Mystery',
    'Parody',
    'Police',
    'Psychological',
    'Romance',
    'Samurai',
    'School',
    'Sci-Fi',
    'Seinen',
    'Shoujo',
    'Shoujo Ai',
    'Shounen',
    'Shounen Ai',
    'Slice of Life',
    'Space',
    'Sports',
    'Super Power',
    'Supernatural',
    'Thriller',
    'Vampire',
];

// Episode selectors for different page types
const SELECTORS = {
    // Home page selectors
    home: {
        spotlight: '.swiper-wrapper .swiper-slide, .slider .slide',
        trending: '#torofilm_wdgt_popular-3-all .chart-item, .chart-content .chart-item',
        topMovies: '#torofilm_wdgt_popular-5-all .chart-item, .chart-content .chart-item',
        recentEpisodes: '.post.episodes, .episodes .post',
        networks: '#gs_logo_area_3 .gs_logo_single a',
        languages: '#aas-anime_language_selector_widget-2 .lang-btn',
    },
    
    // Info page selectors
    info: {
        title: 'meta[property="og:title"], h1, .entry-title',
        poster: 'div[style*="margin-bottom"] img[data-src], .post-thumbnail img',
        synopsis: '.entry-content, .post-content',
        episodes: 'article.post a[href*="/episode/"]',
        genres: 'a[href*="/category/genre/"]',
        infoItems: '.info-item, .item',
    },
    
    // Stream page selectors
    stream: {
        iframe: 'iframe[src], iframe[data-src]',
        videoScripts: 'script',
        downloadLinks: 'a[href*="download"], a.download-btn',
    },
    
    // Search selectors
    search: {
        results: '.search-results .post, .posts .post, .result-item',
        item: '.post, .movies .tt, .film-item',
    },
};

// API endpoint paths
const ENDPOINTS = {
    HOME: '/api/home',
    INFO: '/api/info',
    EPISODES: '/api/episodes',
    STREAM: '/api/stream',
    SEARCH: '/api/search',
    SERIES: '/api/series',
    MOVIES: '/api/movies',
    TOP_TEN: '/api/top-ten',
    RANDOM: '/api/random',
    SCHEDULE: '/api/schedule',
    GENRES: '/api/genres',
    NETWORKS: '/api/networks',
    LANGUAGES: '/api/languages',
    HEALTH: '/api/health',
};

// HTTP status codes
const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    TOO_MANY_REQUESTS: 429,
};

// Error messages
const ERRORS = {
    MISSING_ID: 'Anime ID is required',
    INVALID_ID: 'Invalid anime ID format',
    NOT_FOUND: 'Anime not found',
    SCRAPE_FAILED: 'Failed to scrape data',
    RATE_LIMITED: 'Too many requests',
    SERVER_ERROR: 'Internal server error',
};

module.exports = {
    SITES,
    SHOW_TYPES,
    QUALITY,
    LANGUAGES,
    GENRES,
    SELECTORS,
    ENDPOINTS,
    HTTP_STATUS,
    ERRORS,
};
