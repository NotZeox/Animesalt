/**
 * Configuration for Anime Salt API
 * Centralized configuration management with all fallbacks and icons
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
    
    // Request Configuration - Optimized for Vercel (10s limit)
    request: {
        timeout: 8000,
        retries: 1,
        retryDelay: 300,
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
        checkperiod: 600, // 10 minutes
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

    // Genre Icons Configuration
    genreIcons: {
        'action': '⚔️',
        'adventure': '🗺️',
        'animation': '🎨',
        'anime': '🎌',
        'biography': '📋',
        'cartoon': '�_cartoon__',
        'comedy': '😂',
        'crime': '🔫',
        'documentary': '📹',
        'drama': '🎭',
        'family': '👨‍👩‍👧‍👦',
        'fantasy': '🧙',
        'film-noir': '🎞️',
        'game': '🎮',
        'history': '📜',
        'horror': '👻',
        'indian': '🕌',
        'kids': '👶',
        'korea': '🇰🇷',
        'korean-drama': '🇰🇷',
        'magic': '✨',
        'malayalam': '🕉️',
        'martial-arts': '🥋',
        'mecha': '🤖',
        'military': '🎖️',
        'movie': '🎬',
        'music': '🎵',
        'musical': '🎤',
        'mystery': '🔍',
        'mythology': '🏛️',
        'police': '👮',
        'political': '🏛️',
        'psychological': '🧠',
        'romance': '💕',
        'school': '🏫',
        'sci-fi': '🚀',
        'seinen': '🧑',
        'short': '📏',
        'shoujo': '👧',
        'shounen': '👦',
        'slice-of-life': '☕',
        'social': '👥',
        'special': '⭐',
        'sports': '⚽',
        'spy': '🕵️',
        'super-power': '💪',
        'supernatural': '👁️',
        'suspense': '⏰',
        'tamil': '🏯',
        'telugu': '📿',
        'thriller': '😱',
        'tv-show': '📺',
        'vampire': '🧛',
        'war': '💣',
        'western': '🤠',
    },

    // Valid Genres Configuration
    validGenres: [
        'action', 'adventure', 'animation', 'anime', 'biography', 'cartoon',
        'comedy', 'crime', 'documentary', 'drama', 'family', 'fantasy',
        'film-noir', 'game', 'history', 'horror', 'indian', 'kids',
        'korea', 'korean-drama', 'magic', 'malayalam', 'martial-arts',
        'mecha', 'military', 'movie', 'music', 'musical', 'mystery',
        'mythology', 'police', 'political', 'psychological', 'romance',
        'school', 'sci-fi', 'seinen', 'short', 'shoujo', 'shounen',
        'slice-of-life', 'social', 'special', 'sports', 'spy', 'super-power',
        'supernatural', 'suspense', 'tamil', 'telugu', 'thriller', 'tv-show',
        'vampire', 'war', 'western'
    ],

    // Language Configuration
    languageCodes: {
        'english': 'en',
        'hindi': 'hi',
        'japanese': 'ja',
        'tamil': 'ta',
        'telugu': 'te',
        'malayalam': 'ml',
        'bengali': 'bn',
        'korean': 'ko',
        'chinese': 'zh',
    },

    languageNames: {
        'en': 'English',
        'hi': 'Hindi',
        'ja': 'Japanese',
        'ta': 'Tamil',
        'te': 'Telugu',
        'ml': 'Malayalam',
        'bn': 'Bengali',
        'ko': 'Korean',
        'zh': 'Chinese',
    },

    languageFlags: {
        'en': '🇺🇸',
        'hi': '🇮🇳',
        'ja': '🇯🇵',
        'ta': '🇮🇳',
        'te': '🇮🇳',
        'ml': '🇮🇳',
        'bn': '🇧🇩',
        'ko': '🇰🇷',
        'zh': '🇨🇳',
    },

    // Content Types Configuration
    contentTypes: {
        SERIES: 'SERIES',
        MOVIE: 'MOVIE',
        CARTOON: 'CARTOON',
    },

    // Quality Patterns
    qualityPatterns: {
        '4K': ['2160p', '4k', 'uhd'],
        '1080p': ['1080p', 'full hd', 'fullhd'],
        '720p': ['720p', 'hd'],
        '480p': ['480p', 'sd'],
        '360p': ['360p'],
    },

    // Download Hosts
    downloadHosts: {
        'dood': 'DoodStream',
        'dropbox': 'DropBox',
        'mediafire': 'MediaFire',
        'mega': 'MEGA',
        'mp4upload': 'MP4Upload',
        'streamlare': 'Streamlare',
        'streamtape': 'StreamTape',
        'streamsb': 'StreamSB',
        'videobuddy': 'VideoBuddy',
        'videovault': 'VideoVault',
        'vidhide': 'VidHide',
        'zippyshare': 'Zippyshare',
    },

    // Fallback Networks
    fallbackNetworks: [
        { id: 'disney-channel', name: 'Disney Channel', logo: null, url: null },
        { id: 'hungama-tv', name: 'Hungama TV', logo: null, url: null },
        { id: 'sony-yay', name: 'Sony YAY', logo: null, url: null },
        { id: 'cartoon-network', name: 'Cartoon Network', logo: null, url: null },
        { id: 'prime-video', name: 'Prime Video', logo: null, url: null },
        { id: 'netflix', name: 'Netflix', logo: null, url: null },
        { id: 'hotstar', name: 'Hotstar', logo: null, url: null },
        { id: 'crunchyroll', name: 'Crunchyroll', logo: null, url: null },
        { id: 'disney-plus', name: 'Disney+', logo: null, url: null },
        { id: 'hbo', name: 'HBO', logo: null, url: null },
        { id: 'hulu', name: 'Hulu', logo: null, url: null },
        { id: 'funimation', name: 'Funimation', logo: null, url: null },
    ],

    // Fallback Genres (with icons)
    fallbackGenres: [
        { id: 'action', name: 'Action', icon: '⚔️' },
        { id: 'adventure', name: 'Adventure', icon: '🗺️' },
        { id: 'comedy', name: 'Comedy', icon: '😂' },
        { id: 'drama', name: 'Drama', icon: '🎭' },
        { id: 'fantasy', name: 'Fantasy', icon: '🧙' },
        { id: 'horror', name: 'Horror', icon: '👻' },
        { id: 'isekai', name: 'Isekai', icon: '🌍' },
        { id: 'martial-arts', name: 'Martial Arts', icon: '🥋' },
        { id: 'mecha', name: 'Mecha', icon: '🤖' },
        { id: 'romance', name: 'Romance', icon: '💕' },
        { id: 'sci-fi', name: 'Sci-Fi', icon: '🚀' },
        { id: 'shounen', name: 'Shounen', icon: '👦' },
        { id: 'slice-of-life', name: 'Slice of Life', icon: '☕' },
        { id: 'sports', name: 'Sports', icon: '⚽' },
        { id: 'supernatural', name: 'Supernatural', icon: '👁️' },
    ],

    // Sub-Only Filtering Patterns
    subOnlyPatterns: [
        /\(sub\b/i,
        /\[sub\]/i,
        /\(sub only\)/i,
        /\[sub only\]/i,
        /\bsub only\b/i,
        /\bsubbed\b/i,
        /\bsubtitle\b/i,
        /\bsubtitles\b/i,
        /\(raw\)/i,
        /\[raw\]/i,
    ],

    // Pagination Defaults
    pagination: {
        defaultPageSize: 20,
        maxPageSize: 100,
        defaultLetterPageSize: 50,
    },

    // Limits
    limits: {
        maxSpotlights: 10,
        maxTrending: 10,
        maxLatest: 20,
        maxTopRated: 20,
        maxOngoing: 20,
        maxMovies: 50,
        maxSeries: 100,
        maxRecentEpisodes: 30,
        maxRelatedAnime: 20,
        maxEpisodes: 500,
    },
};
