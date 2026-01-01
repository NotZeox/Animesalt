/**
 * AnimeSalt API - Complete Edition v3.0
 * Comprehensive anime data extraction API for animesalt.cc
 * 
 * Features:
 * - Complete data extraction (genres, languages, networks, episodes)
 * - Season x Episode format (2x1, 1x5, etc.)
 * - Only 2 players extraction
 * - Upcoming episode timers
 * - Smart recommendations (series→series, movie→movie, cartoon→cartoon)
 * - High-quality backdrop images for spotlights
 * - Full API documentation at /docs
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://animesalt.cc';

// Request configuration
const requestConfig = {
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    },
};

// CORS configuration for browser requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    
    next();
});

// In-memory cache
const cache = new Map();
const CACHE_TTL = {
    home: 5 * 60 * 1000,
    info: 30 * 60 * 1000,
    episodes: 15 * 60 * 1000,
    category: 10 * 60 * 1000,
};

// Helper: Fetch HTML
async function fetchHTML(url) {
    try {
        const response = await axios.get(url, requestConfig);
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

// Helper: Get from cache
function getFromCache(key) {
    const item = cache.get(key);
    if (item && Date.now() - item.timestamp < item.ttl) {
        return item.data;
    }
    return null;
}

// Helper: Set cache
function setCache(key, data, ttl) {
    cache.set(key, { data, timestamp: Date.now(), ttl });
}

// Helper: Parse episode format SxEP
function parseEpisodeFormat(text) {
    const patterns = [
        /Season\s*(\d+)[\s\-]*EP[:\s]*(\d+)/i,
        /EP[:\s]*(\d+)/,
        /(\d+)x(\d+)/i,
        /Season\s*(\d+)[\s\-]*Episode[\s\-]*(\d+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match.length === 3) {
                return { season: parseInt(match[1]), episode: parseInt(match[2]) };
            } else if (match.length === 2) {
                return { season: 1, episode: parseInt(match[1]) };
            }
        }
    }
    
    return { season: 1, episode: null };
}

// Helper: Parse timer string to seconds
function parseTimer(timerText) {
    const match = timerText.match(/(\d+)d\s*(\d+)h|(\d+)h\s*(\d+)m|(\d+)d|(\d+)h|(\d+)m/);
    if (!match) return null;
    
    let seconds = 0;
    const d = parseInt(match[1] || 0);
    const h = parseInt(match[2] || match[3] || 0);
    const m = parseInt(match[4] || match[5] || 0);
    
    seconds += d * 24 * 60 * 60;
    seconds += h * 60 * 60;
    seconds += m * 60;
    
    return seconds;
}

// Helper: Extract timer date from data-target attribute (Unix timestamp)
function extractTimerDate(dataTarget) {
    if (!dataTarget) return null;
    
    // Check if it's a Unix timestamp (number)
    const timestamp = parseInt(dataTarget);
    if (!isNaN(timestamp)) {
        // Check if it's in seconds or milliseconds
        // Timestamps are usually in seconds for Unix time, milliseconds for JS Date
        const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
        return date.toISOString();
    }
    
    return null;
}

// Helper: Extract ID from URL
function extractIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/(series|movies)\/([^\/]+)\/?$/);
    if (match) return match[2];
    const epMatch = url.match(/\/episode\/[^\/]+-(\d+)x(\d+)/);
    if (epMatch) return epMatch[1];
    return null;
}

// Helper: Normalize URL
function normalizeUrl(url) {
    if (!url) return null;
    
    // Fix duplicate URL issue: remove duplicate BASE_URL if present
    if (url.includes(BASE_URL + BASE_URL)) {
        url = url.replace(BASE_URL + BASE_URL, BASE_URL);
    }
    if (url.includes('https://animesalt.cchttps://animesalt.cc')) {
        url = url.replace('https://animesalt.cchttps://animesalt.cc', 'https://animesalt.cc');
    }
    
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    
    // Check if URL already contains BASE_URL
    if (url.includes(BASE_URL)) {
        return url;
    }
    
    return url;
}

// Helper: Parse anime item from post element (correct structure)
function parseAnimeItem($el) {
    // Find the link inside the post - structure: <article class="post"><a class="lnk-blk" href="..."></a></article>
    const link = $el.find('a.lnk-blk').attr('href') || 
                 $el.find('a[href*="/series/"]').attr('href') ||
                 $el.find('a[href*="/movies/"]').attr('href');
    
    // Get title from img alt or from the post text
    const title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim() ||
                  $el.find('.Title, .entry-title, .title').text().trim() ||
                  $el.text().substring(0, 100).trim();
    
    // Get poster from img data-src or src
    const poster = $el.find('img').attr('data-src') || 
                   $el.find('img').attr('src') ||
                   $el.find('img').attr('data-lazy-src');
    
    if (!link || !title) return null;
    
    const id = extractIdFromUrl(link);
    const epInfo = parseEpisodeFormat($el.text());
    const epMatch = $el.text().match(/EP[:\s]*(\d+)/i);
    
    // Detect if it's a cartoon
    const isCartoon = title.toLowerCase().includes('cartoon') || 
                      link.includes('/cartoon/') ||
                      $el.text().toLowerCase().includes('cartoon');
    
    return {
        id: id,
        title: title,
        poster: normalizeUrl(poster),
        url: normalizeUrl(link),
        latestEpisode: epMatch ? epMatch[1] : null,
        season: epInfo.season,
        episode: epInfo.episode,
        episodeLabel: epInfo.episode ? `${epInfo.season}xEP:${epInfo.episode}` : null,
        type: link.includes('/movies/') ? 'MOVIE' : (isCartoon ? 'CARTOON' : 'SERIES'),
        isCartoon: isCartoon,
    };
}

// ==================== SECTION NAMES (Matching animesalt.cc) ====================
const SECTION_NAMES = {
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
};

// ==================== API DOCUMENTATION ====================

const API_DOCS = {
    version: '3.0',
    name: 'AnimeSalt API',
    baseUrl: '/api',
    endpoints: [
        {
            method: 'GET',
            path: '/home',
            description: 'Get homepage data with spotlights, trending, upcoming episodes, networks, and more',
            parameters: [],
            response: {
                spotlights: 'Array of 8 spotlight items (4 series + 4 films) with high-quality backdrop images',
                trending: 'Array of 10 trending anime items',
                upcomingEpisodes: 'Array of upcoming episodes with timers and countdown',
                networks: 'Array of streaming networks with logos',
                genres: 'Array of available genres',
                languages: 'Array of available audio languages',
                topSeries: 'Array of top 15 series',
                topMovies: 'Array of top 15 movies',
            }
        },
        {
            method: 'GET',
            path: '/info?id={anime_id}',
            description: 'Get detailed information about a specific anime with smart related recommendations',
            parameters: [
                { name: 'id', type: 'string', required: true, example: 'naruto-shippuden' }
            ],
            response: {
                id: 'Anime ID',
                title: 'Anime title',
                synopsis: 'Full description',
                poster: 'Poster image URL',
                backgroundImage: 'Background image URL from watch page (high quality TMDB images)',
                type: 'SERIES, MOVIE, or CARTOON',
                status: 'Current status (Ongoing, Completed, Released)',
                releaseDate: 'Release year',
                releaseYear: 'Release year (e.g., 2007, 2021)',
                duration: 'Duration (e.g., "25 min" for series, "1h 45m" for movies)',
                quality: 'Video quality (480p, 720p, 1080p)',
                genres: 'Array of genres',
                languages: 'Array of available languages',
                networks: 'Array of streaming networks',
                relatedAnime: 'Array of up to 50 related anime (recommends same type: series→series, movie→movie, cartoon→cartoon)',
                otherNames: 'Array of alternative titles',
                totalEpisodes: 'Total episode count (for series)',
            }
        },
        {
            method: 'GET',
            path: '/episodes?id={anime_id}',
            description: 'Get episode list for an anime with season information',
            parameters: [
                { name: 'id', type: 'string', required: true, example: 'naruto-shippuden' }
            ],
            response: {
                id: 'Anime ID',
                totalEpisodes: 'Total episode count',
                totalSeasons: 'Total season count',
                allSeasons: 'Array of seasons with episode ranges',
            }
        },
        {
            method: 'GET',
            path: '/stream?id={anime_id}&episode={number}',
            description: 'Get streaming links for a specific episode (clean URLs without pagination)',
            parameters: [
                { name: 'id', type: 'string', required: true, example: 'naruto-shippuden' },
                { name: 'episode', type: 'number', required: false, example: 1 }
            ],
            response: {
                success: 'Boolean',
                sources: 'Array of video sources with player URLs (clean, no pagination params)',
                message: 'Status message',
            }
        },
        {
            method: 'GET',
            path: '/search?q={keyword}',
            description: 'Search for anime by keyword',
            parameters: [
                { name: 'q', type: 'string', required: true, example: 'naruto' }
            ],
            response: {
                success: 'Boolean',
                results: 'Array of matching anime',
                total: 'Total count',
            }
        },
        {
            method: 'GET',
            path: '/genre/{genre_name}',
            description: 'Get anime by genre',
            parameters: [
                { name: 'genre_name', type: 'string', required: true, example: 'action' }
            ],
            response: {
                success: 'Boolean',
                anime: 'Array of anime in this genre',
            }
        },
        {
            method: 'GET',
            path: '/letter/{char}',
            description: 'Get anime starting with a specific letter (A-Z, 0-9)',
            parameters: [
                { name: 'char', type: 'string', required: true, example: 'A' }
            ],
            response: {
                success: 'Boolean',
                letter: 'The letter queried',
                anime: 'Array of anime starting with this letter',
            }
        },
        {
            method: 'GET',
            path: '/cartoon?type={series|movies}',
            description: 'Get cartoon series or movies',
            parameters: [
                { name: 'type', type: 'string', required: false, example: 'series' }
            ],
            response: {
                success: 'Boolean',
                anime: 'Array of cartoon content',
            }
        },
        {
            method: 'GET',
            path: '/random',
            description: 'Get a random anime from trending',
            parameters: [],
            response: {
                success: 'Boolean',
                anime: 'Random anime object',
            }
        },
        {
            method: 'GET',
            path: '/docs',
            description: 'View this API documentation in HTML format',
            parameters: [],
            response: 'HTML page with complete API documentation',
        },
    ],
    features: [
        'Smart recommendations (recommends same type: series→series, movie→movie, cartoon→cartoon)',
        'High-quality backdrop images (w1280) for spotlights from watch pages',
        'Upcoming episode timers with countdown display',
        'Season and episode extraction with sub/dub flags',
        'Multi-language support (Hindi, Tamil, Telugu, English, Japanese, Korean, etc.)',
        'Network logos and streaming platform information',
        'Comprehensive genre matching for related anime (up to 20 recommendations)',
        'Clean streaming URLs without pagination parameters',
    ],
};

// ==================== EXTRACTORS ====================

/**
 * Extract home page data
 */
async function extractHome() {
    const cacheKey = 'home';
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
        const html = await fetchHTML(BASE_URL);
        const $ = cheerio.load(html);
        
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
        
        // Extract Networks with logos from GS Logo Slider
        $('#gs_logo_area_3 .gs_logo_single--wrapper a').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            // Use data-src first (which has the real URL), then fallback to src
            const img = $el.find('img').attr('data-src') || $el.find('img').attr('src');
            const name = $el.find('img').attr('alt') || $el.attr('title') || $el.find('img').attr('title');
            
            if (href && name && !result.networks.find(n => n.id === href.split('/').pop())) {
                result.networks.push({
                    id: href.split('/').pop() || name.toLowerCase().replace(/\s+/g, '-'),
                    name: name,
                    logo: normalizeUrl(img),
                    url: normalizeUrl(href),
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
        
        // Extract Languages from widget selector
        $('#aas-anime_language_selector_widget-2 .lang-btn').each((i, el) => {
            const $el = $(el);
            const langName = $el.find('.lang-name').text().trim();
            const langNative = $el.find('.lang-native').text().trim();
            
            if (langName && !result.languages.find(l => l.name === langName)) {
                result.languages.push({
                    id: langName.toLowerCase().replace(/\s+/g, '-'),
                    name: langName,
                    native: langNative,
                });
            }
        });
        
        // Fallback languages
        if (result.languages.length === 0) {
            result.languages = [
                { id: 'english', name: 'English' },
                { id: 'hindi', name: 'Hindi' },
                { id: 'tamil', name: 'Tamil' },
                { id: 'telugu', name: 'Telugu' },
                { id: 'japanese', name: 'Japanese' },
                { id: 'korean', name: 'Korean' },
            ];
        }
        
        // Extract Genres from all post categories
        $('li[class*="category-"]').each((i, el) => {
            const classes = $(el).attr('class') || '';
            classes.split(' ').forEach(cls => {
                if (cls.startsWith('category-') && 
                    cls !== 'category-post' && 
                    cls !== 'category-movies' &&
                    cls !== 'category-episode' &&
                    cls !== 'category-status-publish' &&
                    cls !== 'category-hentry') {
                    const id = cls.replace('category-', '');
                    const name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    // Filter out single letter categories and ensure it's a real genre
                    if (id.length > 3 && !result.genres.find(g => g.id === id) && result.genres.length < 25) {
                        result.genres.push({ id, name });
                    }
                }
            });
        });
        
        // Also extract from genre links
        $('a[href*="/category/genre/"]').each((i, el) => {
            const href = $(el).attr('href');
            const name = $(el).text().trim();
            if (href && name && !result.genres.find(g => g.id === href.split('/').pop())) {
                const id = href.split('/genre/')[1];
                if (id && id.length < 50) {
                    result.genres.push({ id, name });
                }
            }
        });
        
        if (result.genres.length === 0) {
            result.genres = [
                { id: 'action', name: 'Action' },
                { id: 'adventure', name: 'Adventure' },
                { id: 'comedy', name: 'Comedy' },
                { id: 'drama', name: 'Drama' },
                { id: 'fantasy', name: 'Fantasy' },
                { id: 'horror', name: 'Horror' },
                { id: 'isekai', name: 'Isekai' },
                { id: 'martial-arts', name: 'Martial Arts' },
                { id: 'mecha', name: 'Mecha' },
                { id: 'romance', name: 'Romance' },
                { id: 'sci-fi', name: 'Sci-Fi' },
                { id: 'shounen', name: 'Shounen' },
                { id: 'slice-of-life', name: 'Slice of Life' },
                { id: 'sports', name: 'Sports' },
                { id: 'supernatural', name: 'Supernatural' },
            ];
        }
        
        // Extract Letters for A-Z navigation
        $('#wdgt_letter-3 .az-lst a').each((i, el) => {
            const $el = $(el);
            const letter = $el.text().trim();
            
            if (letter && !result.letters.includes(letter)) {
                result.letters.push(letter);
            }
        });
        
        if (result.letters.length === 0) {
            result.letters = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }
        
        // Extract Trending from Most-Watched sections with chart-item structure
        // TRENDING: Top 6 series + Top 4 films = 10 items total
        let trendingSeriesCount = 0;
        let trendingFilmCount = 0;
        const maxTrendingSeries = 6;
        const maxTrendingFilms = 4;
        
        // Extract from chart items (Most-Watched sections)
        const mostWatchedContainer = $('#torofilm_wdgt_popular-3-all, #torofilm_wdgt_popular-3-aa-top, [id*="torofilm_wdgt_popular"]');
        
        mostWatchedContainer.find('.chart-item').each((i, el) => {
            if (trendingSeriesCount >= maxTrendingSeries && trendingFilmCount >= maxTrendingFilms) return;
            
            const $el = $(el);
            const link = $el.find('.chart-poster').attr('href');
            const title = $el.find('.chart-title').text().trim();
            const poster = $el.find('.chart-poster img').attr('data-src') || 
                          $el.find('.chart-poster img').attr('src');
            
            if (link && title) {
                const id = extractIdFromUrl(link);
                
                if (link.includes('/movies/')) {
                    // Add to trending as Most Watched Films
                    if (trendingFilmCount < maxTrendingFilms && !result.trending.find(t => t.id === id)) {
                        result.trending.push({
                            id: id,
                            title: title,
                            poster: normalizeUrl(poster),
                            url: normalizeUrl(link),
                            latestEpisode: null,
                            type: 'MOVIE',
                            source: 'Most Watched Films',
                        });
                        trendingFilmCount++;
                    }
                } else {
                    // Add to trending as Most Watched Series
                    if (trendingSeriesCount < maxTrendingSeries && !result.trending.find(t => t.id === id)) {
                        result.trending.push({
                            id: id,
                            title: title,
                            poster: normalizeUrl(poster),
                            url: normalizeUrl(link),
                            latestEpisode: null,
                            type: 'SERIES',
                            source: 'Most Watched Series',
                        });
                        trendingSeriesCount++;
                    }
                }
            }
        });
        
        // Fill remaining trending from other sources if needed
        if (result.trending.length < 10) {
            const fallbackSelectors = [
                '#widget_list_movies_series-2 .latest-movies-series-swiper-slide',
                '.tranding-slider .swiper-slide',
                '.trending-slider .swiper-slide',
                'article.post, li.post'
            ];
            
            for (const selector of fallbackSelectors) {
                if (result.trending.length >= 10) break;
                
                $(selector).find('a[href*="/series/"], a[href*="/movies/"]').each((i, el) => {
                    if (result.trending.length >= 10) return;
                    
                    const href = $(el).attr('href');
                    const $parent = $(el).closest('.chart-item, article, li');
                    const title = $parent.find('.chart-title, .Title, .title').text().trim() ||
                                 $(el).find('img').attr('alt')?.replace(/^Image /, '').trim();
                    const poster = $parent.find('img').attr('data-src') || 
                                  $parent.find('img').attr('src') ||
                                  $(el).find('img').attr('data-src');
                    
                    if (href && title) {
                        const id = extractIdFromUrl(href);
                        
                        if (href.includes('/movies/')) {
                            if (trendingFilmCount < maxTrendingFilms && !result.trending.find(t => t.id === id)) {
                                result.trending.push({
                                    id: id,
                                    title: title,
                                    poster: normalizeUrl(poster),
                                    url: normalizeUrl(href),
                                    latestEpisode: null,
                                    type: 'MOVIE',
                                    source: 'Most Watched Films',
                                });
                                trendingFilmCount++;
                            }
                        } else {
                            if (trendingSeriesCount < maxTrendingSeries && !result.trending.find(t => t.id === id)) {
                                result.trending.push({
                                    id: id,
                                    title: title,
                                    poster: normalizeUrl(poster),
                                    url: normalizeUrl(href),
                                    latestEpisode: null,
                                    type: 'SERIES',
                                    source: 'Most Watched Series',
                                });
                                trendingSeriesCount++;
                            }
                        }
                    }
                });
            }
        }
        
        // Extract SPOTLIGHTS: 8 items (4 films + 4 series, shuffled)
        // ENHANCEMENT: Use high-quality backdrop images (w1280) from watch pages as requested
        let spotlightSeriesCount = 0;
        let spotlightFilmCount = 0;
        const maxSpotlightSeries = 4;
        const maxSpotlightFilms = 4;
        let spotlightCandidates = [];
        
        // First, collect all candidates from chart items
        mostWatchedContainer.find('.chart-item').each((i, el) => {
            const $el = $(el);
            const link = $el.find('.chart-poster').attr('href');
            const title = $el.find('.chart-title').text().trim();
            const poster = $el.find('.chart-poster img').attr('data-src') || 
                          $el.find('.chart-poster img').attr('src');
            
            if (link && title) {
                const id = extractIdFromUrl(link);
                const isMovie = link.includes('/movies/');
                
                spotlightCandidates.push({
                    id: id,
                    title: title,
                    poster: normalizeUrl(poster),
                    url: normalizeUrl(link),
                    latestEpisode: null,
                    type: isMovie ? 'MOVIE' : 'SERIES',
                    source: isMovie ? 'Most Watched Films' : 'Most Watched Series',
                });
            }
        });
        
        // Add more candidates from other sections
        const spotlightSelectors = [
            '#widget_list_movies_series-5 .latest-movies-series-swiper-slide',
            '.spotlight-swiper .swiper-slide',
            '.featured-slider .swiper-slide',
            '.hero-slider .swiper-slide',
            'article.post, li.post'
        ];
        
        for (const selector of spotlightSelectors) {
            $(selector).find('a[href*="/series/"], a[href*="/movies/"]').each((i, el) => {
                const href = $(el).attr('href');
                const $parent = $(el).closest('.chart-item, article, li');
                const title = $parent.find('.chart-title, .Title, .title').text().trim() ||
                             $(el).find('img').attr('alt')?.replace(/^Image /, '').trim();
                const poster = $parent.find('img').attr('data-src') || 
                              $parent.find('img').attr('src');
                
                if (href && title) {
                    const id = extractIdFromUrl(href);
                    const isMovie = href.includes('/movies/');
                    
                    if (!spotlightCandidates.find(c => c.id === id)) {
                        spotlightCandidates.push({
                            id: id,
                            title: title,
                            poster: normalizeUrl(poster),
                            url: normalizeUrl(href),
                            latestEpisode: null,
                            type: isMovie ? 'MOVIE' : 'SERIES',
                            source: 'Featured',
                        });
                    }
                }
            });
        }
        
        // Separate into films and series
        const filmCandidates = spotlightCandidates.filter(c => c.type === 'MOVIE');
        const seriesCandidates = spotlightCandidates.filter(c => c.type === 'SERIES');
        
        // Take up to 4 films and up to 4 series (based on available)
        const maxSpotlightSeriesCount = Math.min(4, seriesCandidates.length);
        const maxSpotlightFilmsCount = Math.min(4, filmCandidates.length);
        const topFilms = filmCandidates.slice(0, maxSpotlightFilmsCount);
        const topSeries = seriesCandidates.slice(0, maxSpotlightSeriesCount);
        
        // Combine and shuffle ALL items together for true randomization
        let finalSpotlights = [...topFilms, ...topSeries];
        
        // Shuffle the spotlights thoroughly for better visual appearance
        for (let i = finalSpotlights.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalSpotlights[i], finalSpotlights[j]] = [finalSpotlights[j], finalSpotlights[i]];
        }
        
        // ENHANCEMENT: Fetch high-quality backdrop images (TPostBg w1280) from watch pages
        // As requested: use <img class="TPostBg lazyloaded" data-src="//image.tmdb.org/t/p/w1280/...">
        const spotlightFetchPromises = finalSpotlights.map(async (spotlight) => {
            try {
                // For movies, use /movies/ URL; for series, use /series/ URL
                const watchUrl = spotlight.type === 'MOVIE' 
                    ? `${BASE_URL}/movies/${spotlight.id}`
                    : `${BASE_URL}/series/${spotlight.id}`;
                
                const watchHtml = await fetchHTML(watchUrl);
                const watch$ = cheerio.load(watchHtml);
                
                // Get TPostBg backdrop image from watch page (w1280 quality)
                // This is what the user specifically requested
                const backdrop = watch$('.TPostBg').attr('data-src') || 
                                watch$('.TPostBg').attr('src');
                
                if (backdrop) {
                    const normalizedBackdrop = normalizeUrl(backdrop);
                    // Use w1280 images for spotlights (high quality as requested)
                    if (normalizedBackdrop.includes('/w1280/') || 
                        normalizedBackdrop.includes('/original/')) {
                        spotlight.poster = normalizedBackdrop;
                    } else if (normalizedBackdrop.includes('/w780/') || 
                               normalizedBackdrop.includes('/w500/')) {
                        // Upgrade smaller images to w1280 by URL manipulation
                        spotlight.poster = normalizedBackdrop.replace(/\/w\d+\//, '/w1280/');
                    } else {
                        spotlight.poster = normalizedBackdrop;
                    }
                }
                
                // Also try to get better poster from watch page as fallback
                const betterPoster = watch$('.anime-poster img').attr('data-src') ||
                                    watch$('.poster img').attr('data-src') ||
                                    watch$('meta[property="og:image"]').attr('content');
                
                if (betterPoster && !betterPoster.includes('placeholder')) {
                    const normalizedPoster = normalizeUrl(betterPoster);
                    // Ensure we use high quality for spotlights
                    if (!normalizedPoster.includes('/w342/') && !normalizedPoster.includes('/w185/')) {
                        spotlight.poster = normalizedPoster;
                    }
                }
                
            } catch (err) {
                // Keep original poster if fetch fails - no error logging needed
            }
            return spotlight;
        });
        
        // Wait for all backdrop fetches to complete
        result.spotlights = await Promise.all(spotlightFetchPromises);
        
        // If still not enough trending, extract from general posts
        if (result.trending.length < 10) {
            $('article.post, li.post').each((i, el) => {
                if (result.trending.length >= 10) return;
                
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item && item.type === 'SERIES') {
                    if (!result.trending.find(t => t.id === item.id)) {
                        result.trending.push({
                            ...item,
                            source: 'General Posts',
                        });
                    }
                }
            });
        }
        
        // If still not enough spotlights (need 8 total), add more items
        if (result.spotlights.length < 8) {
            $('article.post, li.post').each((i, el) => {
                if (result.spotlights.length >= 8) return;
                
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item) {
                    if (!result.spotlights.find(s => s.id === item.id)) {
                        result.spotlights.push({
                            ...item,
                            source: 'General Posts',
                        });
                    }
                }
            });
        }
        
        // Extract Top Series from swiper
        $('#widget_list_movies_series-2 .latest-movies-series-swiper-slide').each((i, el) => {
            if (i >= 15) return;
            
            const $el = $(el);
            const item = parseAnimeItem($el);
            
            if (item && item.type === 'SERIES') {
                result.topSeries.push({
                    rank: result.topSeries.length + 1,
                    ...item,
                });
            }
        });
        
        // Extract Top Movies from swiper with multiple selectors
        const topMoviesSelectors = [
            '#widget_list_movies_series-5 .latest-movies-series-swiper-slide',
            '.movies-swiper .swiper-slide',
            '.top-movies .swiper-slide',
            '.featured-movies .swiper-slide',
            '#widget_movies-2 .swiper-slide',
            '.movies-slider .swiper-slide'
        ];
        
        for (const selector of topMoviesSelectors) {
            if (result.topMovies.length >= 15) break;
            
            $(selector).each((i, el) => {
                if (result.topMovies.length >= 15) return;
                
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item && item.type === 'MOVIE') {
                    result.topMovies.push({
                        rank: result.topMovies.length + 1,
                        ...item,
                    });
                }
            });
        }
        
        // If still no movies, try to find movies from other sections
        if (result.topMovies.length === 0) {
            $('a[href*="/movies/"]').closest('article, li, .TPost, .post').each((i, el) => {
                if (result.topMovies.length >= 15) return;
                
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item && item.type === 'MOVIE') {
                    if (!result.topMovies.find(m => m.id === item.id)) {
                        result.topMovies.push({
                            rank: result.topMovies.length + 1,
                            ...item,
                        });
                    }
                }
            });
        }
        
        // Extract Fresh Drops from Fresh Drops section
        // Structure: .latest-ep-swiper-slide with article.post containing img[data-src], .post-ql (season), .year (EP info), .entry-title, .lnk-blk[href]
        $('.latest-ep-swiper-slide').each((i, el) => {
            const $el = $(el);
            
            // Get the link from the .lnk-blk anchor
            const link = $el.find('.lnk-blk').attr('href') || 
                         $el.find('a[href*="/series/"]').attr('href') ||
                         $el.find('a[href*="/movies/"]').attr('href');
            
            // Get title from .entry-title
            const title = $el.find('.entry-title').text().trim();
            
            // Get poster from img data-src attribute (lazy loaded image)
            const poster = $el.find('.post-thumbnail img').attr('data-src') ||
                          $el.find('img').attr('data-src') ||
                          $el.find('img').attr('src');
            
            // Get season from .post-ql span (e.g., "Season 15")
            const seasonText = $el.find('.post-ql').text().trim();
            const seasonMatch = seasonText.match(/Season\s*(\d+)/i);
            const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
            
            // Get episode info from .year span (e.g., "EP:322-343" or "EP:9-10")
            const yearText = $el.find('.year').text().trim();
            const epMatch = yearText.match(/EP[:\s]*(\d+(?:-\d+)?)/i);
            
            if (link && title) {
                const id = extractIdFromUrl(link);
                
                // Parse episode info
                let episode = null;
                let episodeRange = null;
                
                if (epMatch) {
                    const epValue = epMatch[1];
                    if (epValue.includes('-')) {
                        // Range like "322-343" - take first episode
                        episodeRange = epValue;
                        episode = parseInt(epValue.split('-')[0]);
                    } else {
                        episode = parseInt(epValue);
                    }
                }
                
                result.freshDrops.push({
                    id: id,
                    title: title,
                    poster: normalizeUrl(poster),
                    url: normalizeUrl(link),
                    season: season,
                    episode: episode,
                    episodeRange: episodeRange,
                    episodeLabel: episode ? `${season}xEP:${episode}` : (episodeRange ? `${season}xEP:${episodeRange}` : null),
                    type: link.includes('/movies/') ? 'MOVIE' : 'SERIES',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        
        // Extract Upcoming Episodes with Timers and Episode Info
        // Structure: #torofilm_upcoming_episodes-2 > .swiper-container > .swiper-wrapper > .swiper-slide.upcoming-ep-swiper-slide
        $('#torofilm_upcoming_episodes-2 .upcoming-ep-swiper-slide').each((i, el) => {
            const $el = $(el);
            
            // Get the link from the .lnk-blk anchor
            const link = $el.find('.lnk-blk').attr('href') || 
                         $el.find('a[href*="/series/"]').attr('href') ||
                         $el.find('a[href*="/movies/"]').attr('href');
            
            // Get title from image alt attribute
            const title = $el.find('img').attr('alt')?.replace(/^Image /, '').trim();
            
            // Get poster from data-src attribute (lazy loaded image)
            const poster = $el.find('img').attr('data-src');
            
            // Extract episode info from .year span (e.g., "EP:344-345", "EP:11")
            const yearText = $el.find('.year').text().trim();
            const epMatch = yearText.match(/EP[:\s]*(\d+(?:-\d+)?)/i);
            
            // Extract timer from countdown-timer span with data-target
            const timerElement = $el.find('.countdown-timer');
            const timerText = timerElement.text().trim();
            const dataTarget = timerElement.attr('data-target');
            
            if (link && title) {
                const id = extractIdFromUrl(link);
                
                // Parse episode info
                let season = 1;
                let episode = null;
                let episodeRange = null;
                
                if (epMatch) {
                    const epValue = epMatch[1];
                    if (epValue.includes('-')) {
                        // Range like "344-345" - take first episode
                        episodeRange = epValue;
                        episode = parseInt(epValue.split('-')[0]);
                    } else {
                        episode = parseInt(epValue);
                    }
                }
                
                // Calculate timer from data-target timestamp
                let timerSeconds = null;
                let releaseDate = null;
                if (dataTarget) {
                    const targetTime = parseInt(dataTarget) * 1000; // Convert to milliseconds
                    const now = Date.now();
                    const diff = targetTime - now;
                    if (diff > 0) {
                        timerSeconds = Math.floor(diff / 1000);
                        releaseDate = new Date(targetTime).toISOString();
                    }
                }
                
                result.upcomingEpisodes.push({
                    id: id,
                    title: title,
                    poster: normalizeUrl(poster),
                    url: normalizeUrl(link),
                    season: season,
                    episode: episode,
                    episodeRange: episodeRange,
                    episodeLabel: episode ? `${season}xEP:${episode}` : (episodeRange ? `${season}xEP:${episodeRange}` : null),
                    timerText: timerText || null,
                    timerSeconds: timerSeconds,
                    releaseDate: releaseDate,
                    isSubOnly: false, // Sub-only info not available in this structure
                });
            }
        });
        

        
        // Extract Latest Movies from cartoon section
        $('#widget_list_movies_series-11 .latest-movies-series-swiper-slide').each((i, el) => {
            const $el = $(el);
            const item = parseAnimeItem($el);
            
            if (item && item.type === 'MOVIE') {
                result.latestMovies.push({
                    ...item,
                    addedAt: new Date().toISOString(),
                });
            }
        });
        
        // If still empty, try to extract from ALL posts on the page
        // This fallback populates trending from article.post elements
        if (result.trending.length === 0 && result.freshDrops.length === 0) {
            // Extract from any article.post with a link
            $('article.post, li.post').each((i, el) => {
                if (i >= 30) return;
                
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item) {
                    // Determine which array to add based on type and existing content
                    if (item.type === 'SERIES') {
                        if (result.trending.length < 10) {
                            result.trending.push(item);
                        } else {
                            result.freshDrops.push({...item, timestamp: new Date().toISOString()});
                        }
                    } else {
                        if (result.topMovies.length < 10) {
                            result.topMovies.push({rank: result.topMovies.length + 1, ...item});
                        } else if (result.latestMovies.length < 20) {
                            result.latestMovies.push({...item, addedAt: new Date().toISOString()});
                        }
                    }
                }
            });
        }
        
        // If spotlights are empty, use top items from trending with enhanced images from watch pages
        // This must happen AFTER trending is populated (by main extraction or fallback)
        if (result.spotlights.length === 0 && result.trending.length > 0) {
            const topItems = result.trending.slice(0, 5);
            
            // Enhance these with images from watch pages
            topItems.forEach((anime) => {
                result.spotlights.push({
                    ...anime,
                });
            });
        }
        
        // Add section names matching animesalt.cc (as requested)
        result.sectionNames = SECTION_NAMES;
        
        // Calculate stats
        result.stats = {
            totalAnime: result.trending.length + result.topSeries.length + result.topMovies.length + 
                       result.freshDrops.length + result.latestMovies.length,
            totalEpisodes: result.freshDrops.length,
            totalGenres: result.genres.length,
        };
        
        setCache(cacheKey, result, CACHE_TTL.home);
        return result;
    } catch (error) {
        // Return empty arrays gracefully instead of crashing
        return {
            success: false,
            error: error.message,
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
            sectionNames: SECTION_NAMES,
            stats: {
                totalAnime: 0,
                totalEpisodes: 0,
                totalGenres: 0,
            },
        };
    }
}

/**
 * Extract anime info with full metadata
 * FIXED: Now handles both series and movies correctly
 */
async function extractInfo(id) {
    const cacheKey = `info_${id}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
        // Determine if this is a movie or series by checking URL pattern
        // Movies have /movies/{id}/ format, series have /series/{id}/ or /episode/{id}/
        // For info endpoint, try both URL patterns
        const seriesUrl = `${BASE_URL}/series/${id}`;
        const movieUrl = `${BASE_URL}/movies/${id}`;
        
        let html = await fetchHTML(seriesUrl);
        let $ = cheerio.load(html);
        let isMovie = false;
        
        // Check if we got a valid series page, if not try movies
        const hasContent = $('h1.entry-title, .anime-info, .TPost').length > 0;
        
        if (!hasContent || $('title').text().includes('404') || $('title').text().includes('Not Found')) {
            // Try movie URL instead
            html = await fetchHTML(movieUrl);
            $ = cheerio.load(html);
            isMovie = true;
        }
        
        const result = {
            success: true,
            id: id,
            title: '',
            otherNames: [],
            poster: '',
            backgroundImage: '',
            synopsis: '',
            type: isMovie ? 'MOVIE' : 'SERIES',
            status: isMovie ? 'Released' : 'Ongoing',
            releaseDate: '',
            releaseYear: '',
            duration: '',
            quality: 'HD',
            url: isMovie ? movieUrl : seriesUrl,
            relatedAnime: [],
        };
        
        result.title = $('h1.entry-title, h1.title, .anime-title').text().trim() ||
                      $('meta[property="og:title"]').attr('content') ||
                      $('title').text().replace(/Watch|Online|Free|Streaming/i, '').trim();
        
        // EXTRACT BACKGROUND IMAGE (TPostBg) - High quality w1280 backdrop for watch page
        // Structure: <img class="TPostBg lazyloaded" data-src="//image.tmdb.org/t/p/w1280/...">
        const bgImage = $('img.TPostBg').attr('data-src') || 
                        $('img.TPostBg').attr('src') ||
                        $('.TPostBg img').attr('data-src') ||
                        $('.TPostBg img').attr('src');
        
        if (bgImage) {
            const normalizedBg = normalizeUrl(bgImage);
            // Ensure we get the high-quality w1280 version
            if (normalizedBg.includes('/w1280/') || normalizedBg.includes('/original/')) {
                result.backgroundImage = normalizedBg;
            } else if (normalizedBg.includes('/w780/') || normalizedBg.includes('/w500/') || normalizedBg.includes('/w342/')) {
                // Upgrade smaller images to w1280
                result.backgroundImage = normalizedBg.replace(/\/w\d+\//, '/w1280/');
            } else {
                result.backgroundImage = normalizedBg;
            }
        }
        
        // FIX POSTER EXTRACTION: Try multiple sources in order of quality
        // Priority: og:image (best) > anime-poster img > TPostBg > other images
        let poster = $('meta[property="og:image"]').attr('content');
        
        if (!poster) {
            // Try to get poster from the main watch page
            poster = $('.anime-poster img').attr('data-src') ||
                     $('.anime-poster img').attr('src') ||
                     $('.poster img').attr('data-src') ||
                     $('.poster img').attr('src') ||
                     $('img.TPostBg').attr('data-src') ||
                     $('img.TPostBg').attr('src') ||
                     $('.post-thumbnail img').attr('data-src') ||
                     $('.post-thumbnail img').attr('src') ||
                     $('img[alt*="poster"]').attr('src') ||
                     $('img[alt*="banner"]').attr('src') ||
                     '';
        }
        
        // Ensure poster is normalized and not empty
        if (poster) {
            result.poster = normalizeUrl(poster);
        } else {
            // Ultimate fallback - try to get any image from the page
            const firstImg = $('article.post img').first().attr('data-src') ||
                            $('article.post img').first().attr('src') ||
                            $('.TPost img').first().attr('data-src') ||
                            $('.TPost img').first().attr('src');
            result.poster = firstImg ? normalizeUrl(firstImg) : null;
        }
        
        result.synopsis = $('meta[property="og:description"]').attr('content') ||
                         $('.synopsis, .description, .summary, .overview').text().trim();
        
        // Extract other names from breadcrumb
        $('.breadcrumbs a, .breadcrumb a').each((i, el) => {
            const name = $(el).text().trim();
            if (name && name !== result.title && !result.otherNames.includes(name)) {
                result.otherNames.push(name);
            }
        });
        
        const pageText = $('body').text().toLowerCase();
        
        // FIXED: Proper type detection with correct precedence
        // Priority 1: Check URL first (most reliable) - use the detected type
        if (isMovie) {
            result.type = 'MOVIE';
        } else if (result.title.toLowerCase().includes('cartoon') || 
                   $('body').text().toLowerCase().includes('/cartoon/')) {
            result.type = 'CARTOON';
        } else {
            result.type = 'SERIES';
        }
        
        if (pageText.includes('completed') || pageText.includes('finished')) {
            result.status = 'Completed';
        } else if (pageText.includes('airing') || pageText.includes('ongoing')) {
            result.status = 'Ongoing';
        }
        
        // Extract release year and duration from page text
        // Duration format: "25 min" (series) or "1h 45m" (movies)
        // Year format: 4 digits (e.g., 2007, 2021)
        const durationMatch = pageText.match(/(\d+h\s*\d+m|\d+h\s*\d+min|\d+ min)/);
        if (durationMatch) {
            result.duration = durationMatch[0].trim();
        }
        
        // Look for year after duration in the text
        const yearMatch = pageText.match(/(\d{4})/);
        if (yearMatch) {
            // Verify it's likely a release year (typically 1990-2030)
            const year = parseInt(yearMatch[1]);
            if (year >= 1990 && year <= 2030) {
                result.releaseYear = yearMatch[0];
            }
        }
        
        // Extract genres
        $('a[href*="/category/genre/"], .genres a, .genre-tags a').each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (name && !result.genres.find(g => g.name === name)) {
                result.genres.push({
                    id: href?.split('/genre/')[1] || name.toLowerCase().replace(/\s+/g, '-'),
                    name: name,
                });
            }
        });
        
        // Extract languages from multiple sources on the watch page
        const langMap = {
            'hindi': 'Hindi', 'tamil': 'Tamil', 'telugu': 'Telugu', 
            'english': 'English', 'japanese': 'Japanese', 'korean': 'Korean',
            'bengali': 'Bengali', 'malayalam': 'Malayalam', 'kannada': 'Kannada',
            'marathi': 'Marathi', 'gujarati': 'Gujarati', 'punjabi': 'Punjabi'
        };
        
        // Method 1: Extract from category links
        $('a[href*="/category/"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const name = $(el).text().trim();
            
            for (const [langId, langName] of Object.entries(langMap)) {
                if (href.includes(`/category/${langId}/`) || href.includes(`/category/language/${langId}/`)) {
                    if (!result.languages.find(l => l.id === langId)) {
                        result.languages.push({ id: langId, name: langName });
                    }
                }
            }
        });
        
        // Method 2: Extract from breadcrumb
        $('.breadcrumbs, .breadcrumb, .breadcrumbs-list, .bnav').find('a span, a, span').each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            for (const [langId, langName] of Object.entries(langMap)) {
                if (text === langId || text === langName.toLowerCase()) {
                    if (!result.languages.find(l => l.id === langId)) {
                        result.languages.push({ id: langId, name: langName });
                    }
                }
            }
        });
        
        // Method 3: Extract from page text content
        const pageTextLower = $('body').text().toLowerCase();
        for (const [langId, langName] of Object.entries(langMap)) {
            if (pageTextLower.includes(langName.toLowerCase()) || pageTextLower.includes(langId)) {
                if (!result.languages.find(l => l.id === langId)) {
                    result.languages.push({ id: langId, name: langName });
                }
            }
        }
        
        // Method 4: Extract from language selector on watch page
        $('.language-selector, .lang-selector, .lang-list, [class*="language"]').find('a').each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href') || '';
            
            for (const [langId, langName] of Object.entries(langMap)) {
                if (name.toLowerCase() === langId || name.toLowerCase() === langName.toLowerCase()) {
                    if (!result.languages.find(l => l.id === langId)) {
                        result.languages.push({ id: langId, name: langName });
                    }
                }
            }
        });
        
        // Method 5: Extract from meta tags
        $('meta[name="keywords"], meta[name="description"]').each((i, el) => {
            const content = $(el).attr('content')?.toLowerCase() || '';
            for (const [langId, langName] of Object.entries(langMap)) {
                if (content.includes(langId) && !result.languages.find(l => l.id === langId)) {
                    result.languages.push({ id: langId, name: langName });
                }
            }
        });
        
        // Extract networks from multiple sources on the watch page
        const networkMap = {
            'disney-channel': 'Disney Channel', 'disney-plus': 'Disney+', 'disney-hotstar': 'Disney+ Hotstar',
            'hungama-tv': 'Hungama TV', 'hungama': 'Hungama',
            'sony-yay': 'Sony YAY', 'sony': 'Sony',
            'cartoon-network': 'Cartoon Network',
            'prime-video': 'Prime Video', 'amazon-prime': 'Prime Video',
            'netflix': 'Netflix',
            'crunchyroll': 'Crunchyroll',
            'hulu': 'Hulu',
            'apple-tv': 'Apple TV',
            'max': 'Max',
            'hotstar': 'Hotstar',
            'funimation': 'Funimation',
            'viz': 'VIZ',
            'animax': 'Animax',
            'tokyo-mx': 'Tokyo MX'
        };
        
        // Method 1: Extract from network category links
        $('a[href*="/category/"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const name = $(el).text().trim();
            
            // Check if it's a network category
            if (href.includes('/category/network/') || href.includes('/network/')) {
                const networkId = href.split('/network/')[1]?.replace(/\/$/, '') || 
                                 href.split('/category/network/')[1]?.replace(/\/$/, '');
                
                if (networkId && !result.networks.find(n => n.id === networkId)) {
                    const displayName = networkMap[networkId] || 
                                       name || 
                                       networkId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    result.networks.push({
                        id: networkId,
                        name: displayName,
                    });
                }
            }
            
            // Also check by name
            for (const [netId, netName] of Object.entries(networkMap)) {
                if (name.toLowerCase().includes(netName.toLowerCase()) || 
                    name.toLowerCase().includes(netId.replace(/-/g, ' '))) {
                    if (!result.networks.find(n => n.id === netId)) {
                        result.networks.push({ id: netId, name: netName });
                    }
                }
            }
        });
        
        // Method 2: Extract from breadcrumb
        $('.breadcrumbs, .breadcrumb, .breadcrumbs-list, .bnav').find('a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href') || '';
            
            for (const [netId, netName] of Object.entries(networkMap)) {
                if (href.includes(`/network/${netId}`) || 
                    text.toLowerCase().includes(netName.toLowerCase())) {
                    if (!result.networks.find(n => n.id === netId)) {
                        result.networks.push({ id: netId, name: netName });
                    }
                }
            }
        });
        
        // Method 3: Extract from page text content (reuse from languages extraction)
        for (const [netId, netName] of Object.entries(networkMap)) {
            if (pageTextLower.includes(netName.toLowerCase().replace(/\s+/g, ' '))) {
                if (!result.networks.find(n => n.id === netId)) {
                    result.networks.push({ id: netId, name: netName });
                }
            }
        }
        
        // Method 4: Extract from network/studio logos on watch page
        $('.network-logo, .studio-logo, .producer-logo, [class*="network"], [class*="studio"]').find('img').each((i, el) => {
            const alt = $(el).attr('alt') || $(el).attr('title') || '';
            const src = $(el).attr('src') || $(el).attr('data-src') || '';
            
            for (const [netId, netName] of Object.entries(networkMap)) {
                if (alt.toLowerCase().includes(netName.toLowerCase()) || 
                    src.toLowerCase().includes(netId)) {
                    if (!result.networks.find(n => n.id === netId)) {
                        result.networks.push({ 
                            id: netId, 
                            name: netName,
                            logo: normalizeUrl(src) 
                        });
                    }
                }
            }
        });
        
        // Method 5: Extract from meta tags
        $('meta[name="keywords"], meta[name="description"]').each((i, el) => {
            const content = $(el).attr('content')?.toLowerCase() || '';
            for (const [netId, netName] of Object.entries(networkMap)) {
                if (content.includes(netId.replace(/-/g, ' ')) || 
                    content.includes(netName.toLowerCase())) {
                    if (!result.networks.find(n => n.id === netId)) {
                        result.networks.push({ id: netId, name: netName });
                    }
                }
            }
        });
        
        // Extract episode count from pagination or text
        const epMatch = pageText.match(/(\d+)\s*episodes?/i);
        result.totalEpisodes = epMatch ? parseInt(epMatch[1]) : 0;
        
        // Count episode links as fallback
        const episodeLinks = $('a[href*="/episode/"]').length;
        if (episodeLinks > result.totalEpisodes) {
            result.totalEpisodes = episodeLinks;
        }
        
        // Extract current episode
        const currentEpMatch = pageText.match(/latest[:\s]*ep[:\s]*(\d+)/i) ||
                              pageText.match(/episode[:\s]*(\d+)/i);
        result.currentEpisode = currentEpMatch ? parseInt(currentEpMatch[1]) : result.totalEpisodes;
        
        // Extract rating
        const ratingMatch = pageText.match(/rating[:\s]*(\d+\.?\d*)/i) ||
                           $('.rating, .score, .star-rating').text().match(/(\d+\.?\d*)/);
        result.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
        
        // Extract quality
        if (pageText.includes('1080p')) result.quality = '1080p';
        else if (pageText.includes('720p')) result.quality = '720p';
        else if (pageText.includes('480p')) result.quality = '480p';
        
        // Extract release year
        const yearMatch = pageText.match(/(19|20)\d{2}/);
        result.releaseDate = yearMatch ? yearMatch[0] : '';
        
        // SMART RECOMMENDATIONS: Collect unlimited related anime of the SAME TYPE
        // This is the key feature: series→series, movie→movie, cartoon→cartoon
        // Use genre matching for smarter recommendations
        let relatedAnimeFound = false;
        
        // Detect if current anime is a cartoon - only check URL, not page text
        // (page text might mention "cartoon" in ads or related content)
        const isCurrentCartoon = url.includes('/cartoon/');
        
        // Determine target type for smart recommendations
        // Priority: CARTOON (if URL has /cartoon/) > MOVIE (if URL has /movies/) > SERIES (default)
        let targetType = 'SERIES'; // Default type
        if (url.includes('/cartoon/')) {
            targetType = 'CARTOON';
        } else if (url.includes('/movies/')) {
            targetType = 'MOVIE';
        } else if (url.includes('/series/') || url.includes('/episode/')) {
            targetType = 'SERIES';
        }
        
        console.log(`[Info] Type detection: URL=${url}, targetType=${targetType}`);
        
        $('.related-anime, .recommended, .similar-anime, .you-may-also-like, .rwdf .TPost').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a[href*="/series/"], a[href*="/movies/"]').attr('href');
            const title = $el.find('.Title, .name, .title').text().trim();
            const poster = $el.find('img').attr('data-src') || $el.find('img').attr('src');
            
            // Check if it's a cartoon
            const isRelatedCartoon = title.toLowerCase().includes('cartoon') || 
                                     link?.includes('/cartoon/');
            const relatedType = link?.includes('/movies/') ? 'MOVIE' : (isRelatedCartoon ? 'CARTOON' : 'SERIES');
            
            // SMART FILTER: Only include if type matches (series→series, movie→movie, cartoon→cartoon)
            if (link && title && relatedType === targetType) {
                const relatedId = extractIdFromUrl(link);
                if (relatedId && relatedId !== id && !result.relatedAnime.find(a => a.id === relatedId)) {
                    result.relatedAnime.push({
                        id: relatedId,
                        title: title,
                        poster: normalizeUrl(poster),
                        url: normalizeUrl(link),
                        type: relatedType,
                        reason: `Similar ${targetType.toLowerCase()}`,
                    });
                    relatedAnimeFound = true;
                }
            }
        });
        
        // Method 2: Fallback - fetch anime from multiple genre categories (2-3 matching genres)
        // SMART FILTER: Only collect same type anime (series→series, movie→movie, cartoon→cartoon)
        if (result.genres.length > 0) {
            // Get top 3 genres for matching (remove trailing slash from id)
            const topGenres = result.genres.slice(0, Math.min(3, result.genres.length));
            
            for (const genre of topGenres) {
                if (result.relatedAnime.length >= 50) break; // Collect up to 50 for unlimited recommendations
                
                try {
                    // Fix: Remove trailing slash from genre id
                    const genreId = genre.id.replace(/\/$/, '');
                    const genreUrl = `${BASE_URL}/category/genre/${genreId}`;
                    const genreHtml = await fetchHTML(genreUrl);
                    const genre$ = cheerio.load(genreHtml);
                    
                    const seenIds = new Set(result.relatedAnime.map(a => a.id));
                    seenIds.add(id); // Exclude the current anime
                    
                    let count = 0;
                    const maxRelated = 15; // Max 15 per genre for unlimited collection
                    
                    // Extract anime from genre page
                    genre$('article.post, li.post, .TPost, .post-item').each((i, el) => {
                        if (result.relatedAnime.length >= 50) return;
                        if (count >= maxRelated) return;
                        
                        const $el = genre$(el);
                        const item = parseAnimeItem($el);
                        
                        // SMART FILTER: Only add if type matches target type
                        if (item && item.id && item.type === targetType && !seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            // Check if this anime shares multiple genres with the current anime
                            const matchingGenres = [genre.name];
                            
                            result.relatedAnime.push({
                                id: item.id,
                                title: item.title,
                                poster: item.poster,
                                url: item.url,
                                type: item.type,
                                reason: `Shared genres: ${matchingGenres.join(', ')} (${targetType})`,
                                matchingGenres: matchingGenres,
                                matchCount: 1,
                            });
                            count++;
                        }
                    });
                    
                } catch (genreError) {
                    // Continue silently on genre fetch error
                }
            }
        }
        
        // Method 3: If still no related anime or need more, fetch from home page
        // SMART FILTER: Only add same type anime from home page trending
        if (result.relatedAnime.length === 0 || result.relatedAnime.length < 20) {
            try {
                const homeData = await extractHome();
                
                if (homeData.success) {
                    const seenIds = new Set([id]);
                    
                    // SMART FILTER: Prioritize same type (series→series, movie→movie, cartoon→cartoon)
                    const typeToFind = targetType;
                    
                    // First, try to find matching type from trending
                    const trendingMatches = homeData.trending.filter(item => 
                        item.id !== id && 
                        item.type === typeToFind &&
                        !seenIds.has(item.id)
                    );
                    
                    // Add from trending (up to 10 more)
                    trendingMatches.slice(0, 10).forEach(item => {
                        if (result.relatedAnime.length >= 20) return;
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            result.relatedAnime.push({
                                id: item.id,
                                title: item.title,
                                poster: item.poster,
                                url: item.url,
                                type: item.type,
                                reason: `Trending ${typeToFind.toLowerCase()}`,
                                matchingGenres: [],
                                matchCount: 0,
                            });
                        }
                    });
                    
                    // If still need more, add from top series/movies based on type
                    if (result.relatedAnime.length < 50) {
                        const topSource = typeToFind === 'SERIES' ? homeData.topSeries : homeData.topMovies;
                        topSource.filter(item => item.type === typeToFind).slice(0, 20).forEach(item => {
                            if (result.relatedAnime.length >= 50) return;
                            if (!seenIds.has(item.id)) {
                                seenIds.add(item.id);
                                result.relatedAnime.push({
                                    id: item.id,
                                    title: item.title,
                                    poster: item.poster,
                                    url: item.url,
                                    type: item.type,
                                    reason: `Top ${typeToFind.toLowerCase()}`,
                                    matchingGenres: [],
                                    matchCount: 0,
                                });
                            }
                        });
                    }
                }
            } catch (homeError) {
                // Continue silently on home fetch error
            }
        }
        
        // Limit to unlimited (all collected recommendations)
        // No slice - return all recommendations found
        
        setCache(cacheKey, result, CACHE_TTL.info);
        return result;
    } catch (error) {
        console.error('[Info Extract] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Extract episodes for an anime with gray-out flags for sub-only content
 * Now with enhanced season parsing to get episode counts from JavaScript-loaded content
 */
async function extractEpisodes(id) {
    const cacheKey = `episodes_${id}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
        const url = `${BASE_URL}/series/${id}`;
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        
        const episodes = [];
        const seasons = [];
        let hasEpisodes = false;
        
        // Helper function to parse episode range from season text
        function parseEpisodeRange(seasonText) {
            // Pattern 1: "Season 1 • 1-32 (32)" - extract start and count
            const rangeMatch1 = seasonText.match(/(\d+)\s*[-–]\s*(\d+)\s*\((\d+)\)/);
            if (rangeMatch1) {
                return { start: parseInt(rangeMatch1[1]), count: parseInt(rangeMatch1[3]) };
            }
            
            // Pattern 2: "Season 1 (32 episodes)" or "Season 1: 32 eps"
            const countMatch = seasonText.match(/\((\d+)\s*episodes?\)/i) || 
                              seasonText.match(/:\s*(\d+)\s*eps?/i);
            if (countMatch) {
                return { start: 1, count: parseInt(countMatch[1]) };
            }
            
            // Pattern 3: "Season 1 EP 1-32"
            const epRangeMatch = seasonText.match(/EP\s*(\d+)\s*[-–]\s*(\d+)/i);
            if (epRangeMatch) {
                return { start: parseInt(epRangeMatch[1]), count: parseInt(epRangeMatch[2]) - parseInt(epRangeMatch[1]) + 1 };
            }
            
            return null;
        }
        
        // Extract seasons with enhanced parsing for episode counts
        // Try multiple selectors for season navigation
        const seasonSelectors = [
            '.snc .snb', 
            '.season-list .season-btn', 
            '.seseasons button',
            '.seasons a',
            '.season-nav a',
            '[class*="season"] a',
            '.nav-seasons a',
            '.season-nav__item a',
            '[class*="season"] button',
            '.seasons-list a',
            '.season-tabs a',
            '.episode-seasons a'
        ];
        
        $(seasonSelectors.join(',')).each((i, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const seasonNum = text.match(/Season\s*(\d+)/i);
            
            if (seasonNum) {
                const isSubOnly = text.includes('(Sub)') || text.toLowerCase().includes('sub');
                const epRange = parseEpisodeRange(text);
                
                seasons.push({
                    season: parseInt(seasonNum[1]),
                    name: text,
                    isSubOnly: isSubOnly,
                    isGrayedOut: isSubOnly,
                    url: url, // Use main anime URL, not javascript:void(0)
                    episodeCount: epRange?.count || 0,
                    episodeStart: epRange?.start || 1,
                });
            }
        });
        
        // Also try to extract season info from any text containing season patterns
        if (seasons.length === 0) {
            // Look for season information in the page text
            const seasonPatterns = [
                /Season\s*(\d+)\s*[-–•]\s*(\d+)\s*[-–]\s*(\d+)\s*\((\d+)\)/g,  // Season X • Y-Z (count)
                /Season\s*(\d+)[:\s]*(\d+)\s*episodes?/gi,
                /Season\s*(\d+)[:\s]*(\d+)\s*eps?/gi,
            ];
            
            for (const pattern of seasonPatterns) {
                let match;
                while ((match = pattern.exec(pageText)) !== null && seasons.length < 30) {
                    const seasonNum = parseInt(match[1]);
                    let episodeCount = 0;
                    let episodeStart = 1;
                    
                    if (match[4]) { // Pattern with count in parentheses
                        episodeCount = parseInt(match[4]);
                    } else if (match[2]) {
                        episodeCount = parseInt(match[2]);
                    }
                    
                    if (!seasons.find(s => s.season === seasonNum)) {
                        seasons.push({
                            season: seasonNum,
                            name: `Season ${seasonNum}`,
                            isSubOnly: false,
                            isGrayedOut: false,
                            url: url,
                            episodeCount: episodeCount,
                            episodeStart: episodeStart,
                        });
                    }
                }
            }
        }
        
        // Sort seasons by season number
        seasons.sort((a, b) => a.season - b.season);
        
        // NEW: Detect sub-only separator - mark episodes after it as sub-only
        // The separator says "Below episodes aren't dubbed in regional languages"
        // HTML structure: <div class="episodes-separator" style="...linear-gradient(135deg, rgba(147, 51, 234...">
        let isAfterSubOnlySeparator = false;
        
        // Check for the sub-only separator div with specific styling
        $('div.episodes-separator, div[class*="sub-separator"], div[class*="subonly"], div[style*="linear-gradient(135deg, rgba(147, 51, 234"]').each((i, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes("aren't dubbed") || text.includes('not dubbed') || 
                text.includes('sub only') || text.includes('sub-only') ||
                text.includes("aren't in regional") || text.includes('regional')) {
                isAfterSubOnlySeparator = true;
                console.log('[Episodes] Found sub-only separator - subsequent episodes marked as sub-only');
            }
        });
        
        // Also check for any separator-like elements containing the specific text
        $('div').each((i, el) => {
            const $div = $(el);
            const text = $div.text().toLowerCase();
            if (text.includes("below episodes aren't dubbed") || 
                text.includes("below episodes aren't in regional") ||
                text.includes("aren't dubbed in regional")) {
                isAfterSubOnlySeparator = true;
                console.log('[Episodes] Found sub-only separator via text - subsequent episodes marked as sub-only');
            }
        });
        
        // Also try to find separator by looking for the SVG icon pattern
        $('svg').each((i, el) => {
            const $svg = $(el);
            const parentText = $svg.parent().text().toLowerCase();
            if (parentText.includes("aren't dubbed") || parentText.includes('regional')) {
                isAfterSubOnlySeparator = true;
                console.log('[Episodes] Found sub-only separator via SVG icon - subsequent episodes marked as sub-only');
            }
        });
        
        // If no seasons found, try to find episode data from other patterns
        if (seasons.length === 0) {
            // Try to find total episode count from the page
            const totalEpMatch = pageText.match(/(\d+)\s*episodes?/i) ||
                                pageText.match(/Total[:\s]*(\d+)\s*ep/i);
            const totalEpisodes = totalEpMatch ? parseInt(totalEpMatch[1]) : 0;
            
            if (totalEpisodes > 0) {
                // Assume single season with all episodes
                seasons.push({
                    season: 1,
                    name: 'Season 1',
                    isSubOnly: false,
                    isGrayedOut: false,
                    url: url,
                    episodeCount: totalEpisodes,
                    episodeStart: 1,
                });
            }
        }
        
        // Also try to find episode links on the page
        // ENHANCED: Use the specific HTML structure provided by user
        // Structure: <article class="post dfx fcl episodes fa-play-circle lg">
        //     <div class="post-thumbnail"><figure><img loading="lazy" src="..."></figure></div>
        //     <header class="entry-header"><span class="num-epi">346</span><h2 class="entry-title">Title</h2></header>
        //     <a href="..." class="lnk-blk"></a>
        // </article>
        // This handles both available episodes (with links) and upcoming/sub-only episodes (without links)
        
        // First, try the specific structure from user's HTML
        $('article.post.dfx.fcl.episodes, article.post.episodes.fa-play-circle, article.post[class*="episodes"]').each((i, el) => {
            const $el = $(el);
            
            // Get episode number from .num-epi span
            const epNumText = $el.find('.num-epi').text().trim();
            const epNum = parseInt(epNumText) || null;
            
            // Get title from .entry-title
            const title = $el.find('.entry-title').text().trim();
            
            // Get poster/thumbnail image - try multiple sources
            let poster = $el.find('.post-thumbnail img').attr('data-src') ||
                         $el.find('.post-thumbnail img').attr('src') ||
                         $el.find('img').attr('data-src') ||
                         $el.find('img').attr('src') ||
                         $el.find('figure img').attr('src') ||
                         '';
            
            // Get the link - check if it exists
            const link = $el.find('.lnk-blk').attr('href') ||
                         $el.find('a[href*="/episode/"]').attr('href') ||
                         $el.find('a').attr('href') ||
                         null;
            
            // Get season from the episode number context or URL
            // URL format: /episode/naruto-shippuden-15x346/ (season 15, episode 346)
            let season = 1;
            if (link) {
                const seasonMatch = link.match(/-(\\d+)x(\\d+)/);
                if (seasonMatch) {
                    // Extract season from URL pattern like: id-15x346 -> season 15
                    season = parseInt(link.match(/-(\\d+)x/)?.[1] || '1');
                }
            }
            
            // Detect if this episode is upcoming/sub-only (no link or no video)
            const isUpcoming = !link || 
                               link === '#' || 
                               link === '' || 
                               $el.hasClass('fa-clock') || 
                               $el.hasClass('sub-only') ||
                               $el.hasClass('upcoming') ||
                               $el.find('.num-epi').hasClass('upcoming');
            
            // Detect if this is sub-only (exists but no dub)
            // Mark as sub-only if: has class, title contains (sub), or we're after the separator
            const isSubOnly = $el.hasClass('sub-only') || 
                             title.toLowerCase().includes('(sub)') ||
                             ($el.text().toLowerCase().includes('sub') && !link) ||
                             isAfterSubOnlySeparator;
            
            // Check for timer/countdown data on upcoming episodes
            let timerSeconds = null;
            let releaseDate = null;
            
            if (isUpcoming) {
                // Look for countdown timer data attributes
                const countdownEl = $el.find('.countdown-timer, .timer, [data-target]');
                const dataTarget = countdownEl.attr('data-target');
                const timerText = countdownEl.text().trim();
                
                if (dataTarget) {
                    // data-target is usually a Unix timestamp
                    const targetTime = parseInt(dataTarget) * 1000;
                    const now = Date.now();
                    const diff = targetTime - now;
                    if (diff > 0) {
                        timerSeconds = Math.floor(diff / 1000);
                        releaseDate = new Date(targetTime).toISOString();
                    }
                } else if (timerText) {
                    // Parse timer text like "2d 3h" or "5h 30m"
                    timerSeconds = parseTimer(timerText);
                    if (timerSeconds) {
                        // Estimate release date from now
                        releaseDate = new Date(Date.now() + timerSeconds * 1000).toISOString();
                    }
                }
            }
            
            if (epNum) {
                // Avoid duplicates
                if (episodes.find(e => e.episode === epNum && e.season === season)) return;
                
                episodes.push({
                    id: `${id}-${season}x${epNum}`,
                    season: season,
                    episode: epNum,
                    episodeLabel: `${season}xEP:${epNum}`,
                    title: title || `Episode ${epNum}`,
                    poster: poster || null,
                    url: link ? normalizeUrl(link) : null,
                    isUpcoming: isUpcoming,
                    isSubOnly: isSubOnly,
                    hasDub: !isSubOnly && !!link,
                    hasSub: true,
                    timerSeconds: timerSeconds,
                    releaseDate: releaseDate,
                    isPlaceholder: !link,
                });
                hasEpisodes = true;
            }
        });
        
        // Fallback: Try generic episode links if specific structure not found
        if (!hasEpisodes) {
            $('a[href*="/episode/"]').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text().trim();
                const epInfo = parseEpisodeFormat(text);
                
                // Skip if no valid episode number found
                if (!link || !epInfo.episode) return;
                
                // Avoid duplicates
                if (episodes.find(e => e.episode === epInfo.episode && e.season === epInfo.season)) return;
                
                hasEpisodes = true;
                
                // Check for sub/dub indicators
                const hasSub = text.toLowerCase().includes('sub');
                const hasDub = text.toLowerCase().includes('dub');
                
                // Check for quality label (indicates regional dub)
                const $parent = $(el).closest('[class*="qlty"], [class*="quality"], [class*="dub"]');
                const hasQualityLabel = $parent.length > 0 || 
                                        text.match(/480p|720p|1080p/i);
                
                // Gray out if no regional dub available
                const isGrayedOut = !hasQualityLabel && (!hasDub || hasSub);
                
                episodes.push({
                    id: link.split('/').pop()?.replace(/\/$/, '') || `${id}-episode-${epInfo.episode}`,
                    season: epInfo.season,
                    episode: epInfo.episode,
                    episodeLabel: `${epInfo.season}xEP:${epInfo.episode}`,
                    url: normalizeUrl(link),
                    hasSub: hasSub || !hasDub,
                    hasDub: hasDub,
                    hasRegionalDub: hasQualityLabel,
                    isGrayedOut: isGrayedOut,
                    releaseDate: null,
                    isUpcoming: false,
                    isSubOnly: false,
                });
            });
        }
        
        // If no individual episodes found but we have season data, generate episodes from season info
        if (!hasEpisodes || episodes.length === 0) {
            let globalEpisodeNum = 1;
            
            for (const season of seasons) {
                const epCount = season.episodeCount || 10; // Default to 10 if not found
                const startEp = season.episodeStart || 1;
                
                for (let epNum = 0; epNum < epCount; epNum++) {
                    const episodeNum = startEp + epNum;
                    episodes.push({
                        id: `${id}-season-${season.season}-episode-${episodeNum}`,
                        season: season.season,
                        episode: episodeNum,
                        episodeLabel: `${season.season}xEP:${episodeNum}`,
                        url: `${url}?season=${season.season}&episode=${episodeNum}`,
                        hasSub: true,
                        hasDub: false,
                        hasRegionalDub: false,
                        isGrayedOut: !season.isSubOnly, // Gray out if it's sub-only
                        releaseDate: null,
                        isPlaceholder: true, // Mark as generated since we don't have real links
                    });
                }
            }
            
            hasEpisodes = episodes.length > 0;
        }
        
        // Sort episodes
        episodes.sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episode - b.episode;
        });
        
        // Update season episode counts if we found real episodes
        seasons.forEach(season => {
            const seasonEpisodes = episodes.filter(ep => ep.season === season.season && !ep.isPlaceholder);
            if (seasonEpisodes.length > 0) {
                season.episodeCount = seasonEpisodes.length;
            }
        });
        
        // Group episodes by season
        const seasonsWithEpisodes = seasons.map(season => {
            const seasonEpisodes = episodes.filter(ep => ep.season === season.season);
            return {
                ...season,
                episodeCount: seasonEpisodes.length,
                episodes: seasonEpisodes,
            };
        });
        
        // Calculate totals
        const totalEpisodes = episodes.length;
        const totalSeasons = seasonsWithEpisodes.length;
        
        const result = {
            success: true,
            id: id,
            totalEpisodes: totalEpisodes,
            totalSeasons: totalSeasons,
            totalSeasonsCount: totalSeasons,
            totalEpisodesCount: totalEpisodes,
            allSeasons: seasonsWithEpisodes,
            seasons: seasonsWithEpisodes,
            episodes: episodes,
            episodeSummary: {
                total: totalEpisodes,
                bySeason: seasonsWithEpisodes.map(s => ({
                    season: s.season,
                    name: s.name,
                    episodeCount: s.episodeCount,
                })),
            },
        };
        
        setCache(cacheKey, result, CACHE_TTL.episodes);
        return result;
    } catch (error) {
        console.error('[Episodes Extract] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Extract stream links (only 2 players: StreamSB and Mp4Upload)
 * FIX: Updated to use animesalt.cc URL format: /episode/{id}-{season}x{episode}/
 */
async function extractStream(episodeId) {
    try {
        // Parse episodeId format - supports multiple formats:
        // - "id-episode-N" (e.g., solo-leveling-episode-1)
        // - "id-XxY" (e.g., naruto-shippuden-1x1) - user-friendly format
        let animeId = episodeId;
        let season = 1;
        let episode = 1;
        
        // Check user-friendly format first (id-XxY, e.g., naruto-shippuden-1x1)
        const userFormatMatch = episodeId.match(/^(.+?)-(\d+)x(\d+)$/i);
        if (userFormatMatch) {
            animeId = userFormatMatch[1];
            season = parseInt(userFormatMatch[2], 10);
            episode = parseInt(userFormatMatch[3], 10);
        }
        // Check full format (id-season-X-episode-Y)
        else {
            const fullMatch = episodeId.match(/^(.+?)-season-(\d+)-episode-(\d+)$/i);
            if (fullMatch) {
                animeId = fullMatch[1];
                season = parseInt(fullMatch[2], 10);
                episode = parseInt(fullMatch[3], 10);
            }
            // Check simple format (id-episode-N)
            else {
                const simpleMatch = episodeId.match(/^(.+?)-episode-(\d+)$/i);
                if (simpleMatch) {
                    animeId = simpleMatch[1];
                    episode = parseInt(simpleMatch[2], 10);
                }
            }
        }
        
        // Try multiple URL formats for episode pages
        // Primary format: /episode/{id}-{season}x{episode}/ (animesalt.cc native format)
        // e.g., https://animesalt.cc/episode/naruto-shippuden-2x34/
        const urlFormats = [
            // Primary: animesalt.cc native format (/{id}-{season}x{episode}/)
            `${BASE_URL}/episode/${animeId}-${season}x${episode}/`,
            // Legacy slug formats
            `${BASE_URL}/series/${episodeId}`,
            `${BASE_URL}/episode/${episodeId}`,
            `${BASE_URL}/watch/${episodeId}`,
            `${BASE_URL}/player/${episodeId}`,
            `${BASE_URL}/stream/${episodeId}`,
        ];
        
        let html = null;
        let usedUrl = null;
        
        for (const url of urlFormats) {
            try {
                html = await fetchHTML(url);
                usedUrl = url;
                break;
            } catch (err) {
                // Try next format
            }
        }
        
        if (!html) {
            return { success: false, error: 'Episode page not found - please check the episode ID' };
        }

        const $ = cheerio.load(html);
        
        // Extract episode name from JSON-LD schema
        let episodeName = '';
        const schemaMatch = html.match(/"name":"([^"]+) - Anime Salt"/);
        if (schemaMatch && schemaMatch[1]) {
            episodeName = schemaMatch[1];
        }
        
        const sources = [];
        
        // Updated player selectors to handle animesalt.cc players
        // IMPORTANT: Look at both 'src' and 'data-src' attributes as animesalt.cc uses data-src
        const playerSelectors = {
            'StreamSB': 'iframe[src*="streamsb"], iframe[data-src*="streamsb"], iframe[src*="sbplay"], iframe[data-src*="sbplay"], iframe[src*="sbhight"], iframe[src*="sbembed"], iframe[src*="sbplaylink"]',
            'Mp4Upload': 'iframe[src*="mp4upload"], iframe[data-src*="mp4upload"], iframe[src*="mp4upload.com"], iframe[src*="mp4upload.org"]',
            'ZephyrFlick': 'iframe[src*="zephyrflick"], iframe[data-src*="zephyrflick"], iframe[src*="play.zephyrflick"], iframe[data-src*="play.zephyrflick"]',
            'MultiLang': 'iframe[src*="multi-lang-plyr"], iframe[data-src*="multi-lang-plyr"]',
        };
        
        for (const [playerName, selector] of Object.entries(playerSelectors)) {
            const playerEl = $(selector);
            if (playerEl.length > 0) {
                // Get URL from src first, fallback to data-src
                let src = playerEl.attr('src') || playerEl.attr('data-src');
                
                if (src) {
                    // Clean the URL - Remove pagination parameters
                    src = src.replace(/[?&]page=\d+/gi, '');
                    src = src.replace(/[?&]pageSize=\d+/gi, '');
                    src = src.replace(/&from=[^&]*/gi, '');
                    src = src.replace(/\?from=[^&]*/gi, '');
                    
                    // Ensure URL is properly normalized
                    src = normalizeUrl(src);
                    
                    // Check for duplicates
                    if (!sources.find(s => s.url === src)) {
                        sources.push({
                            name: playerName,
                            url: src,
                            type: 'iframe',
                            quality: 'auto',
                        });
                    }
                }
            }
        }
        
        // Fallback extraction - look at ALL iframes including data-src
        if (sources.length === 0) {
            $('iframe[src], iframe[data-src]').each((i, el) => {
                let src = $(el).attr('src') || $(el).attr('data-src');
                if (src && sources.length < 3) {
                    // Clean URL of pagination parameters
                    src = src.replace(/[?&]page=\d+/gi, '');
                    src = src.replace(/[?&]pageSize=\d+/gi, '');
                    src = src.replace(/&from=[^&]*/gi, '');
                    src = src.replace(/\?from=[^&]*/gi, '');
                    
                    // Determine player name from URL
                    let playerName = 'Player';
                    if (src.includes('streamsb') || src.includes('sbplay')) playerName = 'StreamSB';
                    else if (src.includes('mp4upload')) playerName = 'Mp4Upload';
                    else if (src.includes('zephyrflick')) playerName = 'ZephyrFlick';
                    else if (src.includes('multi-lang-plyr')) playerName = 'MultiLang';
                    
                    if (!sources.find(s => s.url === src)) {
                        sources.push({
                            name: playerName,
                            url: normalizeUrl(src),
                            type: 'iframe',
                            quality: 'auto',
                        });
                    }
                }
            });
        }
        
        const result = {
            success: true,
            episodeId: episodeId,
            episodeName: episodeName,
            episodeNumber: episode,
            seasonNumber: season,
            url: usedUrl,
            players: sources.slice(0, 2),
            totalPlayers: sources.length,
        };
        
        return result;
    } catch (error) {
        console.error('[Stream Extract] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Extract movie stream links
 * FIX: Updated to handle animesalt.cc movie pages
 */
async function extractMovieStream(movieId) {
    try {
        // Build movie URL - animesalt.cc uses /movies/{id}/
        const movieUrl = `${BASE_URL}/movies/${movieId}/`;
        
        const html = await fetchHTML(movieUrl);
        
        if (!html) {
            return { success: false, error: 'Movie page not found - please check the movie ID' };
        }

        const $ = cheerio.load(html);
        
        // Extract movie name from meta tags (cleaner than JSON-LD)
        let movieName = '';
        
        // Try og:title meta tag first (cleanest for movies)
        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
            movieName = ogTitleMatch[1].replace(/ - Watch Now.*$/, '').replace(/&amp;/g, ' &').trim();
        }
        
        // Fallback: try page title
        if (!movieName) {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
                movieName = titleMatch[1].split(' - ')[0].replace(/&amp;/g, ' &').trim();
            }
        }
        
        const sources = [];
        
        // Player selectors for movies (same as episodes)
        const playerSelectors = {
            'StreamSB': 'iframe[src*="streamsb"], iframe[data-src*="streamsb"], iframe[src*="sbplay"], iframe[data-src*="sbplay"]',
            'Mp4Upload': 'iframe[src*="mp4upload"], iframe[data-src*="mp4upload"]',
            'ZephyrFlick': 'iframe[src*="zephyrflick"], iframe[data-src*="zephyrflick"], iframe[src*="play.zephyrflick"], iframe[data-src*="play.zephyrflick"]',
            'MultiLang': 'iframe[src*="multi-lang-plyr"], iframe[data-src*="multi-lang-plyr"]',
        };
        
        for (const [playerName, selector] of Object.entries(playerSelectors)) {
            const playerEl = $(selector);
            if (playerEl.length > 0) {
                let src = playerEl.attr('src') || playerEl.attr('data-src');
                
                if (src) {
                    // Clean URL
                    src = src.replace(/[?&]page=\d+/gi, '');
                    src = src.replace(/[?&]pageSize=\d+/gi, '');
                    src = src.replace(/&from=[^&]*/gi, '');
                    src = src.replace(/\?from=[^&]*/gi, '');
                    
                    src = normalizeUrl(src);
                    
                    if (!sources.find(s => s.url === src)) {
                        sources.push({
                            name: playerName,
                            url: src,
                            type: 'iframe',
                            quality: 'auto',
                        });
                    }
                }
            }
        }
        
        // Fallback extraction
        if (sources.length === 0) {
            $('iframe[src], iframe[data-src]').each((i, el) => {
                let src = $(el).attr('src') || $(el).attr('data-src');
                if (src && sources.length < 3) {
                    src = src.replace(/[?&]page=\d+/gi, '');
                    src = src.replace(/[?&]pageSize=\d+/gi, '');
                    src = src.replace(/&from=[^&]*/gi, '');
                    src = src.replace(/\?from=[^&]*/gi, '');
                    
                    let playerName = 'Player';
                    if (src.includes('streamsb') || src.includes('sbplay')) playerName = 'StreamSB';
                    else if (src.includes('mp4upload')) playerName = 'Mp4Upload';
                    else if (src.includes('zephyrflick')) playerName = 'ZephyrFlick';
                    else if (src.includes('multi-lang-plyr')) playerName = 'MultiLang';
                    
                    if (!sources.find(s => s.url === src)) {
                        sources.push({
                            name: playerName,
                            url: normalizeUrl(src),
                            type: 'iframe',
                            quality: 'auto',
                        });
                    }
                }
            });
        }
        
        const result = {
            success: true,
            movieId: movieId,
            movieName: movieName,
            url: movieUrl,
            players: sources.slice(0, 2),
            totalPlayers: sources.length,
        };
        
        return result;
    } catch (error) {
        console.error('[Movie Stream Extract] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Search anime with pagination
 */
async function searchAnime(query, page = 1, pageSize = 20) {
    try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await fetchHTML(searchUrl);
        const $ = cheerio.load(html);
        
        const results = [];
        
        $('.search-results, .posts, .movies .tt, article.post, .TPost').find('.TPost, .post, article').each((i, el) => {
            if (i >= pageSize) return;
            
            const $el = $(el);
            const item = parseAnimeItem($el);
            
            if (item) {
                results.push(item);
            }
        });
        
        return {
            success: true,
            query: query,
            page: page,
            pageSize: pageSize,
            totalResults: results.length,
            results: results,
        };
    } catch (error) {
        console.error('[Search] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Extract category pages
 * Updated: Now follows pagination to fetch ALL pages for unlimited content
 */
async function extractCategory(type, value, page = 1, pageSize = 20) {
    try {
        let url;
        switch (type) {
            case 'genre':
                url = `${BASE_URL}/category/genre/${value}`;
                break;
            case 'network':
                url = `${BASE_URL}/category/network/${value}`;
                break;
            case 'language':
                url = `${BASE_URL}/category/language/${value}`;
                break;
            case 'letter':
                url = value === '#' ? `${BASE_URL}/letter/0-9` : `${BASE_URL}/letter/${value}`;
                break;
            case 'series':
                url = `${BASE_URL}/series`;
                break;
            case 'movies':
                url = `${BASE_URL}/movies`;
                break;
            case 'ongoing':
                url = `${BASE_URL}/ongoing-series`;
                break;
            case 'cartoon':
                url = `${BASE_URL}/category/type/cartoon/?type=${value}`;
                break;
            default:
                return { success: false, error: 'Invalid category type' };
        }
        
        const allResults = [];
        const seenIds = new Set();
        let currentPage = 1;
        let maxPages = 50; // Limit to prevent infinite loops, fetch up to 50 pages for unlimited content
        let hasMorePages = true;
        
        // Helper function to extract items from a page
        async function extractFromPage(pageUrl) {
            const html = await fetchHTML(pageUrl);
            const $ = cheerio.load(html);
            
            const results = [];
            
            // Extract all posts from the page (endless scroll, no pagination)
            // Try multiple selectors to find anime items
            const selectors = [
                'article.post', 
                'li.post',
                '.posts .post',
                '.movies-list .post',
                '.TPost',
                '.post-item',
                '.anime-item',
                '.movie-item',
                '[class*="post"]',
                '.content .item',
                '.archive-item'
            ];
            
            // Combine all unique elements found
            let allElements = $();
            selectors.forEach(selector => {
                $(selector).each((i, el) => {
                    // No limit - collect all elements
                    allElements = allElements.add($(el));
                });
            });
            
            // Also try finding links to series/movies pages
            $('a[href*="/series/"], a[href*="/movies/"]').each((i, el) => {
                // No limit - collect all links
                const href = $(el).attr('href');
                const $parent = $(el).closest('article, li, div, figure, .item');
                allElements = allElements.add($parent);
            });
            
            // Parse each element - collect all (no limit)
            allElements.each((i, el) => {
                const $el = $(el);
                const item = parseAnimeItem($el);
                
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    results.push(item);
                }
            });
            
            // Fallback: If still empty, try to extract from the entire page
            if (results.length === 0) {
                $('a[href*="/series/"], a[href*="/movies/"]').each((i, el) => {
                    const href = $(el).attr('href');
                    const id = extractIdFromUrl(href);
                    
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        const $img = $(el).find('img');
                        const title = $img.attr('alt')?.replace(/^Image /, '').trim() || 
                                      $(el).text().trim().substring(0, 100);
                        const poster = $img.attr('data-src') || $img.attr('src') || 
                                       $img.attr('data-lazy-src');
                        
                        results.push({
                            id: id,
                            title: title,
                            poster: normalizeUrl(poster),
                            url: normalizeUrl(href),
                            latestEpisode: null,
                            season: 1,
                            episode: null,
                            episodeLabel: null,
                            type: href.includes('/movies/') ? 'MOVIE' : 'SERIES',
                        });
                    }
                });
            }
            
            return results;
        }
        
        // Fetch first page
        const firstPageResults = await extractFromPage(url);
        allResults.push(...firstPageResults);
        
        // Find pagination links and fetch more pages
        // Try multiple pagination patterns
        while (hasMorePages && currentPage < maxPages) {
            currentPage++;
            
            // Try different pagination URL patterns
            let nextUrl;
            
            // Pattern 1: /page/N/
            if (url.includes('?')) {
                nextUrl = url.replace(/\/$/, '') + `&page=${currentPage}`;
            } else {
                nextUrl = url.replace(/\/$/, '') + `/page/${currentPage}/`;
            }
            
            try {
                const nextPageResults = await extractFromPage(nextUrl);
                
                if (nextPageResults.length > 0) {
                    allResults.push(...nextPageResults);
                    console.log(`[Category] Fetched page ${currentPage} - Total: ${allResults.length} items`);
                } else {
                    // No more results found, stop pagination
                    hasMorePages = false;
                    console.log(`[Category] No more results at page ${currentPage} - stopping`);
                }
            } catch (pageError) {
                // Page doesn't exist or error fetching, stop pagination
                hasMorePages = false;
            }
        }
        
        // If we only got one page worth of results, try alternative URL patterns
        if (allResults.length < 20) {
            console.log(`[Category] Only got ${allResults.length} results, trying alternative URL patterns...`);
            
            // Try without trailing slash
            const altUrl = url.replace(/\/$/, '');
            const altResults = await extractFromPage(altUrl);
            
            if (altResults.length > allResults.length) {
                allResults.length = 0;
                allResults.push(...altResults);
            }
        }
        
        return {
            success: true,
            type: type,
            value: value,
            page: 1,
            pageSize: allResults.length,
            totalResults: allResults.length,
            results: allResults,
            hasMore: false,
            endlessScroll: true,
            fetchedPages: currentPage
        };
    } catch (error) {
        console.error('[Category] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Extract random anime
 */
async function extractRandom() {
    try {
        const homeData = await extractHome();
        
        if (!homeData.success) {
            return { success: false, error: 'Failed to fetch home page data' };
        }
        
        const allAnime = [
            ...homeData.spotlights,
            ...homeData.trending,
            ...homeData.freshDrops,
        ];
        
        const validAnime = allAnime
            .filter(anime => anime && anime.id)
            .filter((anime, index, self) => 
                index === self.findIndex(a => a.id === anime.id)
            );
        
        if (validAnime.length === 0) {
            return { success: false, error: 'No anime found' };
        }
        
        const randomAnime = validAnime[Math.floor(Math.random() * validAnime.length)];
        const info = await extractInfo(randomAnime.id);
        
        return {
            success: true,
            data: info,
            source: randomAnime,
        };
    } catch (error) {
        console.error('[Random Extract] Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==================== LANDING PAGE ====================

const landingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnimeSalt API - Masterpiece Edition</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #8b5cf6;
            --primary-dark: #7c3aed;
            --secondary: #ec4899;
            --background: #0f0f13;
            --surface: #1a1a24;
            --surface-light: #252532;
            --text: #f3f4f6;
            --text-muted: #9ca3af;
            --success: #10b981;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--background);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
        }
        .bg-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        .bg-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(15, 15, 19, 0.95) 0%, rgba(15, 15, 19, 0.8) 50%, rgba(139, 92, 246, 0.1) 100%);
            backdrop-filter: blur(3px);
        }
        .particles { position: absolute; width: 100%; height: 100%; }
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--primary);
            border-radius: 50%;
            opacity: 0.3;
            animation: float 15s infinite ease-in-out;
        }
        @keyframes float {
            0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 60px 0; }
        .hero-content { text-align: center; position: relative; z-index: 1; }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 20px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 50px;
            margin-bottom: 32px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        }
        .status-dot {
            width: 10px;
            height: 10px;
            background: var(--success);
            border-radius: 50%;
            animation: blink 1s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .status-text { font-size: 14px; font-weight: 500; color: var(--success); text-transform: uppercase; letter-spacing: 1px; }
        .logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: clamp(48px, 10vw, 80px);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 16px;
            background: linear-gradient(135deg, var(--text) 0%, var(--primary) 50%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.3));
        }
        .tagline {
            font-size: clamp(16px, 3vw, 20px);
            color: var(--text-muted);
            margin-bottom: 48px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 64px; }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
        }
        .btn-primary:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4);
        }
        .btn-secondary {
            background: var(--surface);
            color: var(--text);
            border: 1px solid var(--surface-light);
        }
        .btn-secondary:hover { background: var(--surface-light); transform: translateY(-4px); }
        .marquee-container {
            background: var(--surface);
            border-radius: 16px;
            padding: 20px 0;
            margin-bottom: 64px;
            overflow: hidden;
            border: 1px solid var(--surface-light);
        }
        .marquee { display: flex; animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 0 32px;
            white-space: nowrap;
            font-family: 'Space Grotesk', monospace;
            font-size: 14px;
        }
        .method { padding: 4px 10px; background: var(--primary); border-radius: 6px; font-size: 12px; font-weight: 600; }
        .endpoint { color: var(--text-muted); }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            max-width: 800px;
            margin: 0 auto 64px;
        }
        .stat-card {
            background: var(--surface);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            border: 1px solid var(--surface-light);
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-8px);
            border-color: var(--primary);
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.1);
        }
        .stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 700; color: var(--primary); margin-bottom: 8px; }
        .stat-label { font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        .features { padding: 80px 0; }
        .section-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(32px, 5vw, 48px); font-weight: 700; text-align: center; margin-bottom: 16px; }
        .section-subtitle { text-align: center; color: var(--text-muted); margin-bottom: 64px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
        .feature-card {
            background: var(--surface);
            border-radius: 20px;
            padding: 32px;
            border: 1px solid var(--surface-light);
            transition: all 0.3s ease;
        }
        .feature-card:hover { transform: translateY(-8px); border-color: var(--primary); }
        .feature-icon {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .feature-title { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
        .feature-desc { color: var(--text-muted); line-height: 1.6; }
        .footer { text-align: center; padding: 40px 0; border-top: 1px solid var(--surface-light); color: var(--text-muted); }
        .footer a { color: var(--primary); text-decoration: none; }
        @media (max-width: 768px) {
            .hero { min-height: auto; padding: 100px 0 60px; }
            .cta-buttons { flex-direction: column; align-items: center; }
            .btn { width: 100%; max-width: 300px; justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="bg-container">
        <div class="bg-overlay"></div>
        <div class="particles" id="particles"></div>
    </div>

    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <div class="status-badge">
                    <span class="status-dot"></span>
                    <span class="status-text">API Online</span>
                </div>

                <h1 class="logo">AnimeSalt API</h1>
                <p class="tagline">
                    The most comprehensive anime data API powered by animesalt.cc.
                    Extract everything - episodes, streams, genres, networks, and more.
                </p>

                <div class="cta-buttons">
                    <a href="/docs" class="btn btn-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Read Documentation
                    </a>
                    <a href="/api/home" class="btn btn-secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        Try API
                    </a>
                </div>

                <div class="marquee-container">
                    <div class="marquee">
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/home</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/info</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/episodes</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/stream</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/search</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/genres</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/cartoon</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/random</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/home</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/info</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/episodes</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/stream</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/search</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/genres</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/cartoon</span></div>
                        <div class="marquee-item"><span class="method">GET</span><span class="endpoint">/api/random</span></div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value">23+</div><div class="stat-label">Endpoints</div></div>
                    <div class="stat-card"><div class="stat-value">2</div><div class="stat-label">Players</div></div>
                    <div class="stat-card"><div class="stat-value">100%</div><div class="stat-label">Data Coverage</div></div>
                    <div class="stat-card"><div class="stat-value">SxEP</div><div class="stat-label">Format</div></div>
                </div>
            </div>
        </div>
    </section>

    <section class="features">
        <div class="container">
            <h2 class="section-title">Complete API Coverage</h2>
            <p class="section-subtitle">Everything you need to build anime streaming apps, databases, and aggregators.</p>

            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📺</div>
                    <h3 class="feature-title">Episode Management</h3>
                    <p class="feature-desc">Extract all episodes with proper Season x Episode format (2x1, 1x5). Gray out episodes without regional dub.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🎬</div>
                    <h3 class="feature-title">Stream Extraction</h3>
                    <p class="feature-desc">Only 2 main player sources extracted. Clean iframe URLs for StreamSB and Mp4Upload.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🏷️</div>
                    <h3 class="feature-title">Rich Metadata</h3>
                    <p class="feature-desc">Genres, languages, networks with logos, related anime, ratings, and status indicators.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">⏰</div>
                    <h3 class="feature-title">Upcoming Timers</h3>
                    <p class="feature-desc">Extract countdown timers for upcoming episodes. Parse timer format into seconds.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Sub-Only Detection</h3>
                    <p class="feature-desc">Seasons labeled "(Sub)" are marked as grayed out and unclickable.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h3 class="feature-title">Cartoon Categories</h3>
                    <p class="feature-desc">Extract cartoon series and movies separately with proper filtering.</p>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>Powered by <a href="https://animesalt.cc" target="_blank">animesalt.cc</a> | Built with ❤️</p>
        </div>
    </footer>

    <script>
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particlesContainer.appendChild(particle);
        }
    </script>
</body>
</html>
`;

// ==================== API ENDPOINTS ====================

app.get('/', (req, res) => {
    res.send(landingPage);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '3.0.0-complete',
    });
});

// API info endpoint (JSON format)
app.get('/api', (req, res) => {
    res.json({
        success: true,
        name: API_DOCS.name,
        version: API_DOCS.version,
        baseUrl: API_DOCS.baseUrl,
        docs: '/docs',
        message: 'Visit /docs for complete API documentation',
        endpoints: API_DOCS.endpoints.map(e => ({
            method: e.method,
            path: e.path,
            description: e.description
        })),
    });
});

// API Documentation endpoint (HTML)
app.get('/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnimeSalt API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2.5em; margin-bottom: 10px; background: linear-gradient(90deg, #e94560, #0f3460); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: #a0a0a0; margin-bottom: 40px; font-size: 1.1em; }
        .section { background: rgba(255,255,255,0.05); border-radius: 15px; padding: 30px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); }
        .section h2 { color: #e94560; margin-bottom: 20px; font-size: 1.5em; }
        .endpoint { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #e94560; }
        .method { display: inline-block; background: #e94560; color: #fff; padding: 5px 12px; border-radius: 5px; font-weight: bold; font-size: 0.8em; margin-right: 10px; }
        .path { font-family: monospace; font-size: 1.1em; color: #4ecdc4; }
        .description { color: #a0a0a0; margin: 10px 0; }
        .params { margin-top: 15px; }
        .param { background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 5px; margin-bottom: 8px; display: flex; align-items: center; }
        .param-name { font-weight: bold; color: #4ecdc4; margin-right: 10px; min-width: 120px; }
        .param-type { color: #e94560; font-size: 0.85em; margin-right: 10px; }
        .param-required { color: #ff6b6b; font-size: 0.75em; margin-left: 5px; }
        .feature { display: inline-block; background: linear-gradient(90deg, #e94560, #0f3460); padding: 8px 15px; border-radius: 20px; margin: 5px; font-size: 0.9em; }
        .response-field { background: rgba(78, 205, 196, 0.1); padding: 8px 12px; border-radius: 5px; margin: 5px 0; font-family: monospace; font-size: 0.9em; }
        code { background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; color: #4ecdc4; }
        .example { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; margin-top: 10px; font-family: monospace; overflow-x: auto; }
        a { color: #e94560; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📺 AnimeSalt API</h1>
        <p class="subtitle">Version ${API_DOCS.version} | Complete Anime Data Extraction API for animesalt.cc</p>
        
        <div class="section">
            <h2>🚀 Key Features</h2>
            ${API_DOCS.features.map(f => `<span class="feature">${f}</span>`).join('')}
        </div>
        
        <div class="section">
            <h2>📡 Available Endpoints</h2>
            ${API_DOCS.endpoints.map(ep => `
                <div class="endpoint">
                    <span class="method">${ep.method}</span>
                    <span class="path">${ep.path}</span>
                    <p class="description">${ep.description}</p>
                    ${ep.parameters.length > 0 ? `
                        <div class="params">
                            <strong style="color: #a0a0a0; display: block; margin-bottom: 10px;">Parameters:</strong>
                            ${ep.parameters.map(p => `
                                <div class="param">
                                    <span class="param-name">${p.name}</span>
                                    <span class="param-type">${p.type}</span>
                                    ${p.required ? '<span class="param-required">required</span>' : ''}
                                    <span style="color: #a0a0a0; margin-left: 10px;">${p.example ? `Example: <code>${p.example}</code>` : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div style="margin-top: 10px;">
                        <strong style="color: #a0a0a0;">Response Fields:</strong>
                        ${Object.entries(ep.response).map(([key, val]) => `<div class="response-field"><code>${key}</code>: ${val}</div>`).join('')}
                    </div>
                    ${ep.path.includes('?') ? `
                        <div class="example">
                            <strong>Example:</strong> <a href="${ep.path.replace('{', '').replace('}', '').split('?')[0] + (ep.path.includes('id=') ? '?id=naruto-shippuden' : (ep.path.includes('q=') ? '?q=naruto' : ''))}">${ep.path.replace('{', '<').replace('}', '>')}</a>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>💡 Quick Examples</h2>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Home Data:</strong></p>
                <div class="example"><code>GET /api/home</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Anime Info:</strong></p>
                <div class="example"><code>GET /api/info?id=naruto-shippuden</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Episodes:</strong></p>
                <div class="example"><code>GET /api/episodes?id=naruto-shippuden</code></div>
                <p style="color: #888; font-size: 0.85em; margin-top: 5px;">Note: No pagination parameters needed - all episodes returned</p>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Search Anime:</strong></p>
                <div class="example"><code>GET /api/search?q=naruto</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Anime by Letter:</strong></p>
                <div class="example"><code>GET /api/letter/A</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Stream Links:</strong></p>
                <div class="example"><code>GET /api/stream?id=naruto-shippuden&episode=1</code></div>
            </div>
        </div>
        
        <p style="text-align: center; color: #a0a0a0; margin-top: 40px;">
            Made with ❤️ for anime lovers | <a href="${BASE_URL}" target="_blank">Visit animesalt.cc</a>
        </p>
    </div>
</body>
</html>
    `);
});

app.get('/api/test', async (req, res) => {
    try {
        await fetchHTML(BASE_URL);
        res.json({
            success: true,
            message: 'Successfully connected to animesalt.cc',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to connect to animesalt.cc',
            error: error.message,
        });
    }
});

app.get('/api/home', async (req, res) => {
    const result = await extractHome();
    res.json(result);
});

app.get('/api/top-ten', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        series: result.trending.slice(0, 10),
        movies: result.topMovies.slice(0, 10),
    });
});

app.get('/api/schedule', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        upcoming: result.upcomingEpisodes,
    });
});

app.get('/api/info', async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ success: false, error: 'ID parameter required' });
    }
    const result = await extractInfo(id);
    res.json(result);
});

app.get('/api/episodes', async (req, res) => {
    const { id, page, pageSize } = req.query;
    // Note: page and pageSize parameters are ignored for episodes endpoint
    // Episodes are returned in full without pagination
    if (!id) {
        return res.status(400).json({ success: false, error: 'ID parameter required' });
    }
    const result = await extractEpisodes(id);
    res.json(result);
});

app.get('/api/stream', async (req, res) => {
    const { id, episode } = req.query;
    if (!id) {
        return res.status(400).json({ success: false, error: 'ID parameter required' });
    }
    
    // Handle episode format: "1x1" (season x episode) or just "1" (episode number)
    // Use user-friendly format that extractStream expects
    let episodeId;
    if (episode) {
        // Check for "1x1" format first - use the XxY format directly
        const epMatch = episode.match(/(\d+)x(\d+)/i);
        if (epMatch) {
            // User-friendly format: id-1x1 (e.g., naruto-shippuden-1x1)
            episodeId = `${id}-${episode}`;
        } else {
            // Simple episode format: id-episode-N
            episodeId = `${id}-episode-${episode}`;
        }
    } else {
        episodeId = `${id}-episode-1`; // Default to episode 1
    }
    
    const result = await extractStream(episodeId);
    res.json(result);
});

app.get('/api/movie/stream', async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Movie ID parameter required' });
    }
    
    const result = await extractMovieStream(id);
    res.json(result);
});

app.get('/api/servers', async (req, res) => {
    const { id, episode } = req.query;
    if (!id) {
        return res.status(400).json({ success: false, error: 'ID parameter required' });
    }
    
    const episodeId = episode ? `${id}-episode-${episode}` : `${id}-episode-1`;
    const result = await extractStream(episodeId);
    res.json({
        success: true,
        episodeId: episodeId,
        servers: result.players,
    });
});

app.get('/api/search', async (req, res) => {
    const { keyword, q, page, pageSize } = req.query;
    const query = keyword || q;
    if (!query) {
        return res.status(400).json({ success: false, error: 'Search keyword required' });
    }
    const result = await searchAnime(query, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/categories', (req, res) => {
    res.json({
        success: true,
        categories: ['series', 'movies', 'ongoing', 'genres', 'networks', 'languages', 'letters', 'cartoon'],
    });
});

app.get('/api/genres', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        genres: result.genres,
    });
});

app.get('/api/genre/:genre', async (req, res) => {
    const { genre } = req.params;
    const { page, pageSize } = req.query;
    const result = await extractCategory('genre', genre, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/networks', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        networks: result.networks,
    });
});

app.get('/api/network/:network', async (req, res) => {
    const { network } = req.params;
    const { page, pageSize } = req.query;
    const result = await extractCategory('network', network, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/languages', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        languages: result.languages,
    });
});

app.get('/api/language/:lang', async (req, res) => {
    const { lang } = req.params;
    const { page, pageSize } = req.query;
    const result = await extractCategory('language', lang, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/series', async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await extractCategory('series', null, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/movies', async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await extractCategory('movies', null, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/ongoing', async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await extractCategory('ongoing', null, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/cartoon', async (req, res) => {
    const { type, page, pageSize } = req.query;
    const cartoonType = type || 'series';
    const result = await extractCategory('cartoon', cartoonType, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/cartoon/series', async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await extractCategory('cartoon', 'series', parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/cartoon/movies', async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await extractCategory('cartoon', 'movies', parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/letters', async (req, res) => {
    const result = await extractHome();
    res.json({
        success: true,
        letters: result.letters,
    });
});

app.get('/api/letter/:letter', async (req, res) => {
    const { letter } = req.params;
    const { page, pageSize } = req.query;
    const result = await extractCategory('letter', letter, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json(result);
});

app.get('/api/random', async (req, res) => {
    const result = await extractRandom();
    if (result.success) {
        res.json(result);
    } else {
        res.status(404).json(result);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('   AnimeSalt API - Masterpiece Edition v3.0');
    console.log('========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`API Base URL: ${BASE_URL}`);
    console.log('');
    console.log('🌐 Main Pages:');
    console.log(`   Landing Page: http://localhost:${PORT}/`);
    console.log(`   API Docs:     http://localhost:${PORT}/docs`);
    console.log(`   API Info:     http://localhost:${PORT}/api`);
    console.log('');
    console.log('📡 Key Endpoints:');
    console.log('   GET /api/home        - Homepage with spotlights, trending, upcoming episodes');
    console.log('   GET /api/info?id=    - Anime details with smart recommendations (up to 20)');
    console.log('   GET /api/episodes?id= - Complete episode list (no pagination)');
    console.log('   GET /api/stream?id=  - Stream links (clean URLs, no pagination)');
    console.log('   GET /api/search?q=   - Search anime');
    console.log('   GET /api/letter/A    - Anime by first letter (A-Z, 0-9)');
    console.log('   GET /api/cartoon?type= - Cartoon series or movies');
    console.log('   GET /api/random      - Random anime');
    console.log('');
    console.log('✨ New Features:');
    console.log('   - High-quality w1280 backdrop images for spotlights (from TPostBg)');
    console.log('   - Smart recommendations (series→series, movie→movie, cartoon→cartoon)');
    console.log('   - Up to 20 related anime recommendations');
    console.log('   - Clean stream URLs (no &page=1&pageSize=20)');
    console.log('   - Episodes endpoint returns all data (no pagination needed)');
    console.log('   - Fresh Drops extraction with season and episode ranges');
    console.log('   - Upcoming Episodes with countdown timers');
    console.log('   - Full API documentation at /docs');
    console.log('   - Empty array handling (freshDrops, etc.)');
    console.log('');
    console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
