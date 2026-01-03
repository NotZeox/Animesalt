/**
 * AnimeSalt API - Configuration
 * Centralized configuration management for the API
 */

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
    },

    // Base URL Configuration
    baseUrl: 'https://animesalt.cc',

    // Request Configuration
    request: {
        timeout: 15000,
        retries: 3,
        retryDelay: 1000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
    },

    // Cache Configuration
    cache: {
        home: 30 * 60 * 1000,      // 30 minutes
        info: 30 * 60 * 1000,      // 30 minutes
        episodes: 15 * 60 * 1000,  // 15 minutes
        category: 10 * 60 * 1000,  // 10 minutes
        stream: 5 * 60 * 1000,     // 5 minutes
        movies: 15 * 60 * 1000,    // 15 minutes
    },

    // Pagination Configuration
    pagination: {
        defaultPageSize: 20,
        maxPageSize: 100,
        moviesPageSize: 20,
        maxMoviesPageSize: 50,
    },

    // Content Type Configuration
    contentTypes: {
        SERIES: 'SERIES',
        MOVIE: 'MOVIE',
        CARTOON: 'CARTOON',
    },

    // Sub-category Configuration
    subCategories: {
        series: ['TV Series', 'OVA/Special', 'ONA'],
        movie: ['Movie'],
        cartoon: ['Series', 'Movies', 'Shorts', 'Specials', 'Crossovers'],
    },

    // Valid Genres
    validGenres: [
        'action', 'adventure', 'cars', 'comedy', 'dementia', 'demons', 'drama', 'ecchi',
        'fantasy', 'game', 'harem', 'historical', 'horror', 'josei', 'kids', 'magic',
        'martial-arts', 'mecha', 'military', 'music', 'mystery', 'parody', 'police',
        'psychological', 'romance', 'samurai', 'school', 'sci-fi', 'seinen', 'shoujo',
        'shounen', 'slice-of-life', 'space', 'sports', 'super-power', 'supernatural',
        'thriller', 'vampire', 'yaoi', 'yuri',
    ],

    // Section Names
    sectionNames: {
        spotlights: 'Spotlight',
        trending: 'Trending Now',
        topSeries: 'Most Watched Series',
        topMovies: 'Most Watched Films',
        freshDrops: 'Fresh Drops',
        upcomingEpisodes: 'Upcoming Episodes',
        latestMovies: 'New Movies',
        networks: 'Streaming On',
        genres: 'Browse by Genre',
        languages: 'Audio Languages',
    },

    // Genre Icons
    genreIcons: {
        'action': '🔥', 'adventure': '🗺️', 'animation': '🎬', 'anime-production': '📺',
        'cars': '🚗', 'comedy': '😂', 'dementia': '🌀', 'demons': '😈', 'drama': '🎭',
        'ecchi': '✨', 'fantasy': '🧙', 'game': '🎮', 'harem': '👥', 'historical': '🏛️',
        'horror': '👻', 'josei': '👩', 'kids': '👶', 'magic': '🪄', 'martial-arts': '🥋',
        'mecha': '🤖', 'military': '⚔️', 'music': '🎵', 'mystery': '🔍', 'parody': '😄',
        'police': '👮', 'psychological': '🧠', 'romance': '💕', 'samurai': '武士',
        'school': '🏫', 'sci-fi': '🚀', 'seinen': '👨', 'shoujo': '👧', 'shounen': '👦',
        'slice-of-life': '☕', 'space': '🌌', 'sports': '⚽', 'super-power': '💪',
        'supernatural': '👽', 'thriller': '😱', 'vampire': '🧛', 'yaoi': '💙', 'yuri': '💜',
    },

    // Language Patterns for Availability Detection
    languagePatterns: {
        'English': ['english', 'eng sub', 'eng dub', 'subtitled in english'],
        'Japanese': ['japanese', 'jpn', 'raw japanese', 'japanese audio'],
        'Hindi': ['hindi', 'hindi dubbed', 'hindi dub', 'bollywood'],
        'Tamil': ['tamil', 'tamil dubbed', 'tamil dub', 'tamil audio'],
        'Telugu': ['telugu', 'telugu dubbed', 'telugu dub', 'telugu audio'],
        'Korean': ['korean', 'korean dubbed', 'korean dub', 'kdrama'],
        'Chinese': ['chinese', 'mandarin', 'cantonese', 'chinese dubbed'],
        'Spanish': ['spanish', 'espanol', 'latino'],
        'Portuguese': ['portuguese', 'pt-br', 'brazilian'],
        'French': ['french', 'français', 'vf french'],
        'German': ['german', 'deutsch', 'german dubbed'],
        'Italian': ['italiano'],
        'Russian': ['russian', 'русский'],
        'Arabic': ['arabic', 'عربي'],
        'Thai': ['thai', 'ไทย'],
        'Vietnamese': ['vietnamese', 'tiếng việt'],
    },

    // Download Host Patterns
    downloadHosts: {
        'drive.google': 'Google Drive',
        'mega': 'Mega',
        '1fichier': '1Fichier',
        'zippy': 'Zippyshare',
        'zippyshare': 'Zippyshare',
        'mediafire': 'MediaFire',
        'dropbox': 'Dropbox',
        'openload': 'OpenLoad',
        'oload': 'OpenLoad',
        'streamango': 'Streamango',
        'streamamen': 'Streamango',
        'rapidgator': 'RapidGator',
        'nitroflare': 'NitroFlare',
        'turbobit': 'TurboBit',
        'uptobox': 'Uptobox',
        'filefox': 'FileFox',
        'fox': 'FileFox',
    },

    // Quality Patterns
    qualityPatterns: {
        '4K': ['4k', '2160p'],
        '1080p': ['1080p', 'full hd'],
        '720p': ['720p', 'hd'],
        '480p': ['480p', 'sd'],
        '360p': ['360p'],
    },

    // Player Configuration
    players: {
        primary: 'HD 1',
        secondary: 'HD 2',
    },
};
