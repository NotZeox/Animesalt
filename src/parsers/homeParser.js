/**
 * Home Parser - Restored original animesalt.cc scraping methodology
 * Matches the authentic structure and data extraction from the source website
 * 
 * Target Response Structure:
 * {
 *   "success": true,
 *   "meta": { "source", "timestamp", "itemCount", "processingTime" },
 *   "spotlights": [...],
 *   "trending": [...],
 *   "mostWatchedSeries": [...],
 *   "mostWatchedMovies": [...],
 *   "freshDrops": [...],
 *   "upcomingEpisodes": [...],
 *   "onAirSeries": [...],
 *   "newAnimeArrivals": [...],
 *   "justInCartoonSeries": [...],
 *   "filters": { "genres", "languages", "letters", "networks" }
 * }
 */

const { fetchHTML } = require('../utils/request');
const config = require('../../config/config');
const { extractIdFromUrl, normalizeUrl, sanitizeText, delay } = require('../utils/helpers');

/**
 * HomeParser class for extracting all home page data
 * Uses the original animesalt.cc scraping methodology
 */
class HomeParser {
    constructor() {
        this.baseUrl = config.baseUrl;
        this.maxRetries = config.request.retries || 3;
        this.requestDelay = config.request.retryDelay || 1000;
    }

    /**
     * Extract all homepage data with original structure
     */
    async extract() {
        const startTime = Date.now();
        const globalItems = new Map();

        try {
            const html = await this.fetchWithRetry(this.baseUrl);
            const $ = require('cheerio').load(html);

            // Extract all sections using the original methodology
            // Trending = mix of Most-Watched Series (6) + Most-Watched Movies (4)
            const mostWatchedSeries = this.extractMostWatchedSeries($);
            const mostWatchedMovies = this.extractMostWatchedMovies($);
            
            // Create mixed trending (6 series + 4 movies = 10 total)
            const trending = this.mixTrending(mostWatchedSeries, mostWatchedMovies);
            
            // Extract new sections from animesalt.cc
            const freshDrops = this.extractFreshDrops($);
            const upcomingEpisodes = this.extractUpcomingEpisodes($);
            const onAirSeries = this.extractOnAirSeries($);
            const newAnimeArrivals = this.extractNewAnimeArrivals($);
            const justInCartoonSeries = this.extractJustInCartoonSeries($);
            
            // Extract spotlights (mix of trending + other content with background images)
            // Now fetches watch pages in parallel to get HD backdrop images
            const spotlights = await this.extractSpotlights($, trending, mostWatchedSeries, mostWatchedMovies);
            
            // Extract filters
            const filters = {
                genres: this.extractGenreList($),
                languages: this.extractLanguageList($),
                letters: this.extractLetterList($),
                networks: this.extractNetworkList($),
            };

            // Collect all items for deduplication
            const allSections = [spotlights, trending, mostWatchedSeries, mostWatchedMovies, freshDrops, upcomingEpisodes, onAirSeries, newAnimeArrivals, justInCartoonSeries];
            
            for (const section of allSections) {
                if (section && Array.isArray(section)) {
                    for (const item of section) {
                        if (item && item.id && !globalItems.has(item.id)) {
                            globalItems.set(item.id, item);
                        }
                    }
                }
            }

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                meta: {
                    source: 'animesalt.cc',
                    timestamp: new Date().toISOString(),
                    itemCount: globalItems.size,
                    processingTime: `${processingTime}ms`,
                },
                spotlights: spotlights,
                trending: trending,
                mostWatchedSeries: mostWatchedSeries,
                mostWatchedMovies: mostWatchedMovies,
                freshDrops: freshDrops,
                upcomingEpisodes: upcomingEpisodes,
                onAirSeries: onAirSeries,
                newAnimeArrivals: newAnimeArrivals,
                justInCartoonSeries: justInCartoonSeries,
                filters: filters,
            };
        } catch (error) {
            console.error('[HomeParser] Error:', error.message);
            
            // Return fallback data when source is unavailable
            return this.getFallbackData();
        }
    }

    /**
     * Get fallback data when source website is unavailable
     */
    getFallbackData() {
        return {
            success: true,
            meta: {
                source: 'fallback',
                timestamp: new Date().toISOString(),
                itemCount: 10,
                processingTime: '0ms',
                isFallback: true,
                message: 'Using sample data - source website was unavailable',
                cache: {
                    timestamp: new Date().toISOString(),
                    age: '0h',
                    isStale: false,
                    isCached: false,
                    isFresh: false,
                    isFallback: true,
                    warning: 'This is sample data. Real data will appear when the source website is available.'
                }
            },
            spotlights: [
                {
                    id: 'naruto-shippuden',
                    title: 'Naruto Shippuden',
                    poster: 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg" alt="Naruto Shippuden" src="https://image.tmdb.org/t/p/w1280/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg"></div>',
                    url: 'https://animesalt.cc/series/naruto-shippuden/',
                    type: 'series',
                    ranking: 1,
                    source: 'Fallback Data'
                },
                {
                    id: 'one-piece',
                    title: 'One Piece',
                    poster: 'https://image.tmdb.org/t/p/w500/xxeV4QLiYP8jmqnwJ0f9xN8t2lE.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/xxeV4QLiYP8jmqnwJ0f9xN8t2lE.jpg" alt="One Piece" src="https://image.tmdb.org/t/p/w1280/xxeV4QLiYP8jmqnwJ0f9xN8t2lE.jpg"></div>',
                    url: 'https://animesalt.cc/series/one-piece/',
                    type: 'series',
                    ranking: 2,
                    source: 'Fallback Data'
                },
                {
                    id: 'demon-slayer-kimetsu-no-yaiba',
                    title: 'Demon Slayer: Kimetsu no Yaiba',
                    poster: 'https://image.tmdb.org/t/p/w500/h8Rb1dH4e3P7uQaQ8f4tJqkT2l0.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/h8Rb1dH4e3P7uQaQ8f4tJqkT2l0.jpg" alt="Demon Slayer" src="https://image.tmdb.org/t/p/w1280/h8Rb1dH4e3P7uQaQ8f4tJqkT2l0.jpg"></div>',
                    url: 'https://animesalt.cc/series/demon-slayer-kimetsu-no-yaiba/',
                    type: 'series',
                    ranking: 3,
                    source: 'Fallback Data'
                },
                {
                    id: 'dragon-ball-super',
                    title: 'Dragon Ball Super',
                    poster: 'https://image.tmdb.org/t/p/w500/1QvGuE3uG5S2c5r6v7q0vJ8l0lS.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/1QvGuE3uG5S2c5r6v7q0vJ8l0lS.jpg" alt="Dragon Ball Super" src="https://image.tmdb.org/t/p/w1280/1QvGuE3uG5S2c5r6v7q0vJ8l0lS.jpg"></div>',
                    url: 'https://animesalt.cc/series/dragon-ball-super/',
                    type: 'series',
                    ranking: 4,
                    source: 'Fallback Data'
                },
                {
                    id: 'death-note',
                    title: 'Death Note',
                    poster: 'https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg" alt="Death Note" src="https://image.tmdb.org/t/p/w1280/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg"></div>',
                    url: 'https://animesalt.cc/series/death-note/',
                    type: 'series',
                    ranking: 5,
                    source: 'Fallback Data'
                },
                {
                    id: 'jujutsu-kaisen-0',
                    title: 'Jujutsu Kaisen 0',
                    poster: 'https://image.tmdb.org/t/p/w500/23oJaeBh0FDk2mQ2P240PU9Xxfh.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/23oJaeBh0FDk2mQ2P240PU9Xxfh.jpg" alt="Jujutsu Kaisen 0" src="https://image.tmdb.org/t/p/w1280/23oJaeBh0FDk2mQ2P240PU9Xxfh.jpg"></div>',
                    url: 'https://animesalt.cc/movies/jujutsu-kaisen-0/',
                    type: 'movie',
                    ranking: 6,
                    source: 'Fallback Data'
                },
                {
                    id: 'solo-leveling',
                    title: 'Solo Leveling',
                    poster: 'https://image.tmdb.org/t/p/w500/rsOApVLbIQEcNkqSlOxNPyg3FyI.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/rsOApVLbIQEcNkqSlOxNPyg3FyI.jpg" alt="Solo Leveling" src="https://image.tmdb.org/t/p/w1280/rsOApVLbIQEcNkqSlOxNPyg3FyI.jpg"></div>',
                    url: 'https://animesalt.cc/series/solo-leveling/',
                    type: 'series',
                    ranking: 7,
                    source: 'Fallback Data'
                },
                {
                    id: 'attack-on-titan',
                    title: 'Attack on Titan',
                    poster: 'https://image.tmdb.org/t/p/w500/i5vX0pJ5lX1v7g8f8Z8f8Z8f8Z8.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/i5vX0pJ5lX1v7g8f8Z8f8Z8f8Z8.jpg" alt="Attack on Titan" src="https://image.tmdb.org/t/p/w1280/i5vX0pJ5lX1v7g8f8Z8f8Z8f8Z8.jpg"></div>',
                    url: 'https://animesalt.cc/series/attack-on-titan/',
                    type: 'series',
                    ranking: 8,
                    source: 'Fallback Data'
                },
                {
                    id: 'my-hero-academia',
                    title: 'My Hero Academia',
                    poster: 'https://image.tmdb.org/t/p/w500/v9vX0v9X0v9X0v9X0v9X0v9X0.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/v9vX0v9X0v9X0v9X0v9X0v9X0.jpg" alt="My Hero Academia" src="https://image.tmdb.org/t/p/w1280/v9vX0v9X0v9X0v9X0v9X0v9X0.jpg"></div>',
                    url: 'https://animesalt.cc/series/my-hero-academia/',
                    type: 'series',
                    ranking: 9,
                    source: 'Fallback Data'
                },
                {
                    id: 'chainsaw-man',
                    title: 'Chainsaw Man',
                    poster: 'https://image.tmdb.org/t/p/w500/xdzLBZjCVSEgic7m7nJc4jNJZVW.jpg',
                    backdrop: '<div class="bghd"><img class="TPostBg lazyloaded" data-src="https://image.tmdb.org/t/p/w1280/xdzLBZjCVSEgic7m7nJc4jNJZVW.jpg" alt="Chainsaw Man" src="https://image.tmdb.org/t/p/w1280/xdzLBZjCVSEgic7m7nJc4jNJZVW.jpg"></div>',
                    url: 'https://animesalt.cc/series/chainsaw-man/',
                    type: 'series',
                    ranking: 10,
                    source: 'Fallback Data'
                }
            ],
            trending: [
                { id: 'naruto-shippuden', title: 'Naruto Shippuden', poster: 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg', type: 'series', ranking: 1 },
                { id: 'one-piece', title: 'One Piece', poster: 'https://image.tmdb.org/t/p/w500/xxeV4QLiYP8jmqnwJ0f9xN8t2lE.jpg', type: 'series', ranking: 2 },
                { id: 'demon-slayer', title: 'Demon Slayer', poster: 'https://image.tmdb.org/t/p/w500/h8Rb1dH4e3P7uQaQ8f4tJqkT2l0.jpg', type: 'series', ranking: 3 },
                { id: 'dragon-ball-super', title: 'Dragon Ball Super', poster: 'https://image.tmdb.org/t/p/w500/1QvGuE3uG5S2c5r6v7q0vJ8l0lS.jpg', type: 'series', ranking: 4 },
                { id: 'death-note', title: 'Death Note', poster: 'https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg', type: 'series', ranking: 5 }
            ],
            mostWatchedSeries: [],
            mostWatchedMovies: [],
            freshDrops: [
                { id: 'naruto-shippuden', title: 'Naruto Shippuden', poster: 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg', type: 'series', season: 15, episode: 468 },
                { id: 'dragon-ball-super', title: 'Dragon Ball Super', poster: 'https://image.tmdb.org/t/p/w500/1QvGuE3uG5S2c5r6v7q0vJ8l0lS.jpg', type: 'series', season: 1, episode: 169 }
            ],
            upcomingEpisodes: [],
            onAirSeries: [],
            newAnimeArrivals: [],
            justInCartoonSeries: [],
            filters: {
                genres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Supernatural'],
                languages: ['English', 'Hindi', 'Japanese', 'Tamil', 'Telugu'],
                letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
                networks: ['Crunchyroll', 'Netflix', 'Funimation']
            }
        };
    }

    /**
     * Fetch HTML with retry logic
     */
    async fetchWithRetry(url, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const html = await fetchHTML(url);
                if (html && html.length > 100) {
                    return html;
                }
                throw new Error('Empty or invalid response');
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                await delay(attempt * this.requestDelay);
            }
        }
    }

    /**
     * Mix trending: 6 most-watched series + 4 most-watched movies
     */
    mixTrending(seriesList, moviesList) {
        const trending = [];
        
        // Take top 6 series
        for (let i = 0; i < Math.min(6, seriesList.length); i++) {
            trending.push({
                ...seriesList[i],
                ranking: i + 1,
                source: 'Most-Watched Series'
            });
        }
        
        // Take top 4 movies
        for (let i = 0; i < Math.min(4, moviesList.length); i++) {
            trending.push({
                ...moviesList[i],
                ranking: 6 + i + 1,
                source: 'Most-Watched Movies'
            });
        }
        
        return trending;
    }

    /**
     * Extract Most-Watched Series section
     */
    extractMostWatchedSeries($) {
        const items = [];
        
        // Look for section with title "Most-Watched Series"
        let section = $();
        $('section, .widget, .wdgt-home').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().trim();
            if (title === 'Most-Watched Series') {
                section = $(this);
                return false;
            }
        });

        // Extract chart items from the section
        if (section.length > 0) {
            section.find('.chart-item').each((i, el) => {
                const item = this.parseChartItem($(el));
                // Only include series, not movies
                if (item && item.type === 'series') {
                    items.push(item);
                }
            });
        }

        // Fallback: extract from any chart-content (filtering out movies)
        if (items.length === 0) {
            $('.chart-content .chart-item').each((i, el) => {
                const item = this.parseChartItem($(el));
                // Only include series
                if (item && item.type === 'series') {
                    items.push(item);
                }
            });
        }

        return items;
    }

    /**
     * Extract Most-Watched Movies section
     */
    extractMostWatchedMovies($) {
        const items = [];
        
        // Try multiple possible section titles for movies
        const movieTitles = ['Most-Watched Movies', 'Top Movies', 'Popular Movies', 'Trending Movies'];
        let section = $();
        
        // Look for section with movie-related titles
        for (const title of movieTitles) {
            $('section, .widget, .wdgt-home').each(function() {
                const sectionTitle = $(this).find('.section-title, .widget-title, h3').text().trim();
                if (sectionTitle === title) {
                    section = $(this);
                    return false;
                }
            });
            if (section.length > 0) break;
        }
        
        // Extract chart items from the section
        if (section.length > 0) {
            section.find('.chart-item').each((i, el) => {
                const item = this.parseChartItem($(el));
                // Only include movies
                if (item && item.type === 'movie') {
                    items.push(item);
                }
            });
        }
        
        // Fallback: try to find any movie chart section
        if (items.length === 0) {
            $('.chart-content .chart-item').each((i, el) => {
                const item = this.parseChartItem($(el));
                // Only include movies
                if (item && item.type === 'movie') {
                    items.push(item);
                }
            });
        }

        return items;
    }

    /**
     * Extract Fresh Drops section
     */
    extractFreshDrops($) {
        const items = [];
        
        // Look for section with title "Fresh Drops"
        let section = $();
        $('section, .widget, .wdgt-home, .wdgt').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().trim();
            if (title === 'Fresh Drops') {
                section = $(this);
                return false;
            }
        });

        // Extract post items from the section - handle swiper slides
        if (section.length > 0) {
            section.find('.swiper-slide li article.post, .swiper-slide > li > article.post, li.post, article.post, .post').each((i, el) => {
                const item = this.parseFreshDropItem($(el));
                if (item) items.push(item);
            });
        }

        // Fallback: extract from any post if items empty - use fresh drop parser
        if (items.length === 0) {
            $('article.post, .post').slice(0, 12).each((i, el) => {
                const item = this.parseFreshDropItem($(el));
                if (item) items.push(item);
            });
        }

        return this.deduplicateItems(items);
    }

    /**
     * Extract Upcoming Episodes section
     */
    extractUpcomingEpisodes($) {
        const items = [];
        
        // Look for section with title "Upcoming Episodes"
        let section = $();
        $('section, .widget, .wdgt-home, .wdgt').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().trim();
            if (title === 'Upcoming Episodes') {
                section = $(this);
                return false;
            }
        });

        // Extract post items from the section - handle swiper slides with countdown
        if (section.length > 0) {
            section.find('.swiper-slide li.post, .swiper-slide > li, li.post, article.post, .post').each((i, el) => {
                const item = this.parseUpcomingItem($(el));
                if (item) items.push(item);
            });
        }

        return this.deduplicateItems(items);
    }

    /**
     * Extract On-Air Series section
     */
    extractOnAirSeries($) {
        const items = [];
        
        // Try multiple possible section titles
        const onAirTitles = ['On-Air Series', 'Currently Airing', 'Ongoing Series', 'Airing Now'];
        let section = $();
        
        for (const title of onAirTitles) {
            $('section, .widget, .wdgt-home, .wdgt').each(function() {
                const sectionTitle = $(this).find('.section-title, .widget-title, h3').text().trim();
                if (sectionTitle === title) {
                    section = $(this);
                    return false;
                }
            });
            if (section.length > 0) break;
        }
        
        // Extract post items from the section
        if (section.length > 0) {
            section.find('article.post, .post, .movies .tt, .item, .anime-card').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) {
                    item.status = 'ongoing';
                    items.push(item);
                }
            });
        }
        
        // Fallback: try finding by link pattern (series pages)
        if (items.length === 0) {
            $('a[href*="/series/"]').closest('article.post, .post, li').slice(0, 12).each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) {
                    item.status = 'ongoing';
                    items.push(item);
                }
            });
        }

        return this.deduplicateItems(items);
    }

    /**
     * Extract New Anime Arrivals section
     */
    extractNewAnimeArrivals($) {
        const items = [];
        
        // Try multiple possible section titles
        const newTitles = ['New Anime Arrivals', 'New Arrivals', 'Latest Additions', 'Just Added'];
        let section = $();
        
        for (const title of newTitles) {
            $('section, .widget, .wdgt-home, .wdgt').each(function() {
                const sectionTitle = $(this).find('.section-title, .widget-title, h3').text().trim();
                if (sectionTitle === title) {
                    section = $(this);
                    return false;
                }
            });
            if (section.length > 0) break;
        }
        
        // Extract post items from the section
        if (section.length > 0) {
            section.find('article.post, .post, .movies .tt, .item, .anime-card').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }
        
        // Fallback: extract recent posts
        if (items.length === 0) {
            $('article.post, .post').slice(0, 12).each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return this.deduplicateItems(items);
    }

    /**
     * Extract Just In: Cartoon Series section
     */
    extractJustInCartoonSeries($) {
        const items = [];
        
        // Look for section with title "Just In: Cartoon Series"
        // The title may contain "View More »" text, so we check if it starts with this phrase
        let section = $();
        $('section, .widget, .wdgt-home, .wdgt, header.section-header').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3').text().trim();
            // Remove "View More »" and extra whitespace
            const cleanTitle = title.replace(/View More.*$/, '').trim();
            if (cleanTitle === 'Just In: Cartoon Series') {
                section = $(this);
                return false;
            }
        });

        // Also try to find by checking swiper container directly
        if (section.length === 0) {
            const swiperContainer = $('.latest-movies-series-swiper-container').closest('section, .widget, .wdgt-home');
            if (swiperContainer.length > 0) {
                section = swiperContainer;
            }
        }

        // Extract post items from the section - handle li elements inside swiper-slide
        if (section.length > 0) {
            section.find('.swiper-slide li.post, .swiper-slide > li, li.post, article.post, .post').each((i, el) => {
                const item = this.parseSwiperItem($(el));
                if (item) items.push(item);
            });
        }

        // Fallback: extract from latest-movies-series swiper if still empty
        if (items.length === 0) {
            $('.latest-movies-series-swiper-slide > li').each((i, el) => {
                const item = this.parseSwiperItem($(el));
                if (item) items.push(item);
            });
        }

        // Deduplicate items by ID
        return this.deduplicateItems(items);
    }

    /**
     * Parse swiper item - handles items from swiper slides with li wrapper
     */
    parseSwiperItem($el) {
        // Find link - look for .lnk-blk class first
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a[href*="/cartoon/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title from image alt attribute
        let title = $el.find('img').attr('alt')?.replace(/^Image /i, '').trim();
        if (!title) {
            // Try to get title from the li id or class
            const liId = $el.attr('id') || '';
            const postMatch = liId.match(/post-(\d+)/);
            if (postMatch) {
                // Try to find title in parent elements
                title = $el.find('.post-thumbnail img').attr('alt')?.replace(/^Image /i, '').trim();
            }
        }
        if (!title) {
            // Fallback: use link to generate a title
            const linkParts = link.split('/');
            const lastPart = linkParts[linkParts.length - 2] || '';
            title = lastPart.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            title = title.charAt(0).toUpperCase() + title.slice(1);
        }
        if (!title) return null;

        // Extract poster with lazy loading support - handle data-src and protocol-relative URLs
        const poster = $el.find('img').attr('data-src') || 
                       $el.find('img').attr('data-lazy-src') ||
                       $el.find('img').attr('src') || '';

        // Determine type from link or class
        let type = 'series';
        if (link.includes('/movies/')) {
            type = 'movie';
        } else if (link.includes('/cartoon/') || $el.hasClass('type-cartoon')) {
            type = 'cartoon';
        }

        // Extract year - use more specific patterns to avoid matching annee-XXXXX incorrectly
        const classes = $el.attr('class') || '';
        let year = new Date().getFullYear();
        
        // Skip annee-XXXXX format entirely as it often contains invalid years
        // Instead look for actual year patterns in text content
        const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        if (yearMatch && parseInt(yearMatch[0]) >= 1960 && parseInt(yearMatch[0]) <= new Date().getFullYear() + 2) {
            year = parseInt(yearMatch[0]);
        }

        // Extract categories/genres from class
        const genreMatch = classes.match(/category-([a-z-]+)/g);
        const genres = genreMatch ? genreMatch.map(g => g.replace('category-', '').replace(/-/g, ' ')) : [];

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: this.fixImageUrl(poster),
            type: type,
            year: year,
            genre: genres.join(', '),
            link: normalizeUrl(link),
        };
    }

    /**
     * Extract Spotlights - mix of trending content with background images
     * Fetches each spotlight item's watch page to extract the HD backdrop from <div class="bghd">
     * Shows exactly 10 items mixed from trending (series + movies)
     * Movies at positions 2 and 6, rest randomized
     */
    async extractSpotlights($, trending, mostWatchedSeries, mostWatchedMovies) {
        const items = [];
        
        // Mix from trending (series + movies mixed together)
        const sourceItems = [...trending];
        
        // Also add some items from mostWatchedSeries and mostWatchedMovies if trending is small
        if (sourceItems.length < 10) {
            // Add series if needed
            for (const item of mostWatchedSeries) {
                if (!sourceItems.find(existing => existing.id === item.id)) {
                    sourceItems.push(item);
                }
                if (sourceItems.length >= 10) break;
            }
            // Add movies if needed
            if (sourceItems.length < 10) {
                for (const item of mostWatchedMovies) {
                    if (!sourceItems.find(existing => existing.id === item.id)) {
                        sourceItems.push(item);
                    }
                    if (sourceItems.length >= 10) break;
                }
            }
        }
        
        // Separate series and movies
        const series = sourceItems.filter(item => item.type === 'series');
        const movies = sourceItems.filter(item => item.type === 'movie');
        
        // Create mixed array: movies at positions 2 and 6, rest randomized
        const mixed = [];
        const positions = [2, 6]; // Movie positions (1-indexed)
        const moviePositions = new Set(positions);
        
        // Shuffle function for randomization
        const shuffle = (arr) => {
            const shuffled = [...arr];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };
        
        // Get random movies for positions 2 and 6
        const shuffledMovies = shuffle(movies);
        const positionMovies = [];
        positions.forEach(pos => {
            if (shuffledMovies.length > 0) {
                positionMovies.push({ movie: shuffledMovies.shift(), position: pos });
            }
        });
        
        // Get remaining movies for random positions
        const remainingMovies = shuffle(shuffledMovies);
        
        // Get random series for other positions
        const remainingSeries = shuffle(series);
        
        // Build preliminary array with basic data (without backdrop yet)
        const preliminaryItems = [];
        
        for (let i = 1; i <= 10; i++) {
            if (moviePositions.has(i)) {
                // Add movie at this position
                const movieData = positionMovies.find(m => m.position === i);
                if (movieData && movieData.movie) {
                    const sourceItem = movieData.movie;
                    preliminaryItems.push({
                        index: i,
                        id: sourceItem.id,
                        title: sourceItem.title,
                        poster: sourceItem.poster,
                        type: sourceItem.type,
                        year: sourceItem.year,
                        genre: sourceItem.genre || '',
                        ranking: i,
                        source: sourceItem.source || 'Spotlight',
                        link: sourceItem.link,
                        spotlightInfo: `Top ${i} trending on AnimeSalt`
                    });
                }
            } else {
                // Add random content (prefer series but can include movies)
                if (remainingSeries.length > 0) {
                    const sourceItem = remainingSeries.shift();
                    preliminaryItems.push({
                        index: i,
                        id: sourceItem.id,
                        title: sourceItem.title,
                        poster: sourceItem.poster,
                        type: sourceItem.type,
                        year: sourceItem.year,
                        genre: sourceItem.genre || '',
                        ranking: i,
                        source: sourceItem.source || 'Spotlight',
                        link: sourceItem.link,
                        spotlightInfo: `Top ${i} trending on AnimeSalt`
                    });
                } else if (remainingMovies.length > 0) {
                    const sourceItem = remainingMovies.shift();
                    preliminaryItems.push({
                        index: i,
                        id: sourceItem.id,
                        title: sourceItem.title,
                        poster: sourceItem.poster,
                        type: sourceItem.type,
                        year: sourceItem.year,
                        genre: sourceItem.genre || '',
                        ranking: i,
                        source: sourceItem.source || 'Spotlight',
                        link: sourceItem.link,
                        spotlightInfo: `Top ${i} trending on AnimeSalt`
                    });
                }
            }
        }
        
        // Fetch watch pages for all spotlight items in parallel to get backdrop images
        const backdropPromises = preliminaryItems.map(async (item) => {
            try {
                const backdropHtml = await this.fetchBackdropFromWatchPage(item.link, item.title);
                return { index: item.index, backdrop: backdropHtml };
            } catch (error) {
                console.error(`[HomeParser] Failed to fetch backdrop for ${item.title}:`, error.message);
                // Fallback to poster-based backdrop if watch page fetch fails
                const backdropUrl = this.getBackdropUrl(item.poster);
                const fallbackHtml = `<div class="bghd"><img class="TPostBg lazyloaded" data-src="${backdropUrl}" alt="${sanitizeText(item.title)}" src="${backdropUrl}"></div>`;
                return { index: item.index, backdrop: fallbackHtml };
            }
        });
        
        // Wait for all backdrop fetches to complete
        const backdropResults = await Promise.all(backdropPromises);
        
        // Merge backdrop data into final items
        const backdropMap = new Map(backdropResults.map(r => [r.index, r.backdrop]));
        
        for (const item of preliminaryItems) {
            const backdrop = backdropMap.get(item.index) || '';
            items.push({
                id: item.id,
                title: item.title,
                poster: item.poster,
                backdrop: backdrop,
                type: item.type,
                year: item.year,
                genre: item.genre,
                ranking: item.ranking,
                source: item.source,
                link: item.link,
                spotlightInfo: item.spotlightInfo
            });
        }
        
        return items;
    }

    /**
     * Parse chart item (from Most-Watched sections)
     */
    parseChartItem($el) {
        // Find link
        const link = $el.find('a.chart-poster').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title
        let title = $el.find('.chart-title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image /i, '').trim();
        }
        if (!title) return null;

        // Extract poster
        const poster = $el.find('img').attr('data-src') || 
                       $el.find('img').attr('src') || 
                       $el.find('img').attr('data-lazy-src') || '';

        // Determine type
        const type = link.includes('/movies/') ? 'movie' : 'series';

        // Extract ranking number
        const ranking = parseInt($el.find('.chart-number').text().trim()) || null;

        // Extract year
        const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        // Extract genre
        const genre = $el.find('.chart-genre').text().trim() || '';

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: this.fixImageUrl(poster),
            type: type,
            year: year,
            genre: genre,
            ranking: ranking,
            link: normalizeUrl(link),
        };
    }

    /**
     * Parse anime item with standardized structure
     */
    parseAnimeItem($el) {
        // Find link using original selectors
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title with original fallbacks
        let title = $el.find('.entry-title, .chart-title, .entry-title, .title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image /i, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster with lazy loading support
        const poster = $el.find('img').attr('data-src') || 
                       $el.find('img').attr('data-lazy-src') ||
                       $el.find('img').attr('src') || '';

        // Determine type using original logic
        const type = link.includes('/movies/') ? 'movie' : 
                     link.includes('/cartoon/') ? 'cartoon' : 'series';

        // Extract episode info
        const episodeText = $el.find('.year, .episode, .ep-info, .post-ql').text().trim();
        const nextEpisode = episodeText.match(/EP:?\s*(\d+[-/]?\d*)/i)?.[1] || null;

        // Extract year
        const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        // Determine status
        let status = 'completed';
        if ($el.text().toLowerCase().includes('airing') || 
            $el.text().toLowerCase().includes('ongoing')) {
            status = 'ongoing';
        }

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: this.fixImageUrl(poster),
            type: type,
            year: year,
            status: status,
            lastEpisode: nextEpisode,
            link: normalizeUrl(link),
        };
    }

    /**
     * Parse Fresh Drop item - extracts season and episode info
     */
    parseFreshDropItem($el) {
        // Find link
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title
        let title = $el.find('.entry-title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image /i, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster
        const poster = $el.find('img').attr('data-src') || 
                       $el.find('img').attr('data-lazy-src') ||
                       $el.find('img').attr('src') || '';

        // Determine type
        const type = link.includes('/movies/') ? 'movie' : 
                     link.includes('/cartoon/') ? 'cartoon' : 'series';

        // Extract season info from .post-ql element
        // Handle formats: "Season 15", "Seasons 15-16", "Season 1", etc.
        const seasonText = $el.find('.post-ql').text().trim();
        const season = seasonText.match(/Seasons?\s*([\d-]+)/i)?.[1] || 
                       seasonText.match(/Season\s*(\d+)/i)?.[1] || null;

        // Extract episode info from .year element
        // Handle formats: "EP:322-347", "EP:12", "28 episodes", "12 episodes", etc.
        const episodeText = $el.find('.year').text().trim();
        const nextEpisode = episodeText.match(/EP:?\s*([\d-]+)/i)?.[1] || 
                            episodeText.match(/(\d+)\s*episodes?/i)?.[1] || null;

        // Extract year using the helper method
        const year = this.extractYear($el);

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: this.fixImageUrl(poster),
            type: type,
            year: year,
            season: season,
            episode: nextEpisode,
            status: 'completed',
            link: normalizeUrl(link),
        };
    }

    /**
     * Parse Upcoming Episode item - extracts countdown timer and episode info
     */
    parseUpcomingItem($el) {
        // Find link
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title
        let title = $el.find('.entry-title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image /i, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster
        const poster = $el.find('img').attr('data-src') || 
                       $el.find('img').attr('data-lazy-src') ||
                       $el.find('img').attr('src') || '';

        // Determine type
        const type = link.includes('/movies/') ? 'movie' : 
                     link.includes('/cartoon/') ? 'cartoon' : 'series';

        // Extract episode info from .year element
        const episodeText = $el.find('.year').text().trim(); // e.g., "EP:11"
        const nextEpisode = episodeText.match(/EP:?\s*([\d-]+)/i)?.[1] || null;

        // Extract countdown timer from .countdown-timer element
        const countdownEl = $el.find('.countdown-timer');
        const countdownText = countdownEl.text().trim(); // e.g., "4h 15m" or "2d 7h"
        const countdownTarget = countdownEl.attr('data-target') || null; // Unix timestamp

        // Extract year using the helper method
        const year = this.extractYear($el);

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: this.fixImageUrl(poster),
            type: type,
            year: year,
            episode: nextEpisode,
            countdown: countdownText,
            countdownTarget: countdownTarget,
            status: 'upcoming',
            link: normalizeUrl(link),
        };
    }

    /**
     * Fetch the HD backdrop from a watch page by extracting <div class="bghd"> content
     * @param {string} detailUrl - URL of the series/movie detail page
     * @param {string} title - Title of the item for fallback
     * @returns {Promise<string>} - HTML string of the backdrop div with wrapper
     */
    async fetchBackdropFromWatchPage(detailUrl, title) {
        try {
            // Fetch the detail page
            const html = await this.fetchWithRetry(detailUrl);
            const $ = require('cheerio').load(html);
            
            // Find the bghd div element
            const bghdDiv = $('div.bghd');
            
            if (bghdDiv.length > 0) {
                // Get the inner HTML (the img tag)
                let innerHtml = bghdDiv.html() || '';
                
                // Fix protocol-relative URLs in the img tag (change // to https://)
                innerHtml = innerHtml.split('data-src="//').join('data-src="https://');
                innerHtml = innerHtml.split('src="//').join('src="https://');
                
                // Return wrapped in bghd div with fixed URLs
                return `<div class="bghd">${innerHtml}</div>`;
            }
            
            // Fallback: try to find any div with backdrop-related class and wrap it
            const fallbackDiv = $('div[class*="backdrop"], div[class*="bg-"], div.TPostBg').first();
            if (fallbackDiv.length > 0) {
                let innerHtml = fallbackDiv.html() || '';
                innerHtml = innerHtml.split('data-src="//').join('data-src="https://');
                innerHtml = innerHtml.split('src="//').join('src="https://');
                return `<div class="bghd">${innerHtml}</div>`;
            }
            
            // If no bghd found, return empty string to trigger fallback in caller
            console.warn(`[HomeParser] No bghd div found for ${title}, will use fallback`);
            return '';
        } catch (error) {
            console.error(`[HomeParser] Error fetching backdrop for ${title}:`, error.message);
            return '';
        }
    }

    /**
     * Fix image URLs
     */
    fixImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('//')) return 'https:' + url;
        if (!url.startsWith('http')) return 'https://' + url;
        return url;
    }

    /**
     * Convert poster URL to backdrop URL (w1280)
     */
    getBackdropUrl(posterUrl) {
        if (!posterUrl) return '';
        // Convert w500 to w1280 for backdrop images
        let backdropUrl = posterUrl.replace('/w500/', '/w1280/');
        // Ensure https protocol is used (fix protocol-relative URLs)
        if (backdropUrl.startsWith('//')) {
            backdropUrl = 'https:' + backdropUrl;
        }
        return backdropUrl;
    }

    /**
     * Extract year from element with fallback to null (not current year)
     * This prevents incorrect year assignment when scraping fails to find the real year
     */
    extractYear($el) {
        // Method 1: Look for year in text content
        const textYearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        if (textYearMatch) {
            const year = parseInt(textYearMatch[0]);
            // Only accept years between 1960 and current year + 2
            const currentYear = new Date().getFullYear();
            if (year >= 1960 && year <= currentYear + 2) {
                return year;
            }
        }

        // Method 2: Look for annee-XXXX pattern in class (French format, might be wrong year)
        const classes = $el.attr('class') || '';
        const anneeMatch = classes.match(/annee-(\d{4})/);
        if (anneeMatch) {
            const year = parseInt(anneeMatch[1]);
            const currentYear = new Date().getFullYear();
            // Accept annee year only if within reasonable range
            if (year >= 1960 && year <= currentYear + 2) {
                return year;
            }
        }

        // Return null if no valid year found - DO NOT default to current year
        return null;
    }

    /**
     * Generate ID from title
     */
    generateId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Deduplicate items by ID
     */
    deduplicateItems(items) {
        const seen = new Map();
        const result = [];
        
        for (const item of items) {
            if (item && item.id) {
                if (!seen.has(item.id)) {
                    seen.set(item.id, true);
                    result.push(item);
                }
            }
        }
        
        return result;
    }

    /**
     * Extract genre list for filters
     */
    extractGenreList($) {
        const genres = new Set();
        
        $('a[href*="/category/genre/"]').each((i, el) => {
            const name = $(el).text().trim();
            if (name) genres.add(name);
        });

        // Add common genres if none found
        if (genres.size === 0) {
            const commonGenres = [
                'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
                'Horror', 'Isekai', 'Romance', 'Sci-Fi', 'Supernatural',
                'Martial Arts', 'Mecha', 'Psychological', 'School', 'Shounen',
                'Slice of Life', 'Sports', 'Thriller', 'Ecchi', 'Music'
            ];
            commonGenres.forEach(g => genres.add(g));
        }

        return Array.from(genres).sort();
    }

    /**
     * Extract language list for filters
     */
    extractLanguageList($) {
        const languages = new Set();
        
        $('a[href*="/category/language/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim();
            
            if (link.includes('/language/')) {
                const lang = link.split('/language/')[1]?.replace(/\//g, '') || name;
                if (lang) languages.add(lang.charAt(0).toUpperCase() + lang.slice(1));
            }
            if (name) languages.add(name);
        });

        // Common languages from animesalt.cc
        if (languages.size === 0) {
            const commonLangs = [
                'English', 'Hindi', 'Japanese', 'Tamil', 'Telugu', 
                'Bengali', 'Malayalam', 'Kannada', 'Korean', 'Chinese'
            ];
            commonLangs.forEach(l => languages.add(l));
        }

        return Array.from(languages).sort();
    }

    /**
     * Extract letter list for A-Z navigation
     */
    extractLetterList($) {
        const letters = new Set();
        
        // Try the specific A-Z navigation structure from animesalt.cc
        $('ul.az-lst a[href*="/letter/"], .az-lst a[href*="/letter/"]').each((i, el) => {
            const letter = $(el).text().trim();
            if (letter) letters.add(letter);
        });
        
        // Fallback to generic letter links
        if (letters.size === 0) {
            $('a[href*="/letter/"]').each((i, el) => {
                const letter = $(el).text().trim();
                if (letter) letters.add(letter);
            });
        }

        // Add default letters if none found
        if (letters.size === 0) {
            '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => letters.add(l));
        }

        return Array.from(letters);
    }

    /**
     * Extract network list for filters
     */
    extractNetworkList($) {
        const networks = new Set();
        
        $('a[href*="/category/network/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim() || $(el).find('img').attr('title') || '';
            
            if (link.includes('/network/')) {
                const network = link.split('/network/')[1]?.replace(/\//g, '') || name;
                if (network) {
                    networks.add(network.charAt(0).toUpperCase() + network.slice(1));
                }
            }
            if (name) networks.add(name);
        });

        // Common networks
        if (networks.size === 0) {
            const commonNetworks = [
                'Crunchyroll', 'Netflix', 'Disney+', 'Prime Video', 
                'Cartoon Network', 'HBO', 'Hulu', 'Disney Channel', 
                'Hungama TV', 'Sony Yay'
            ];
            commonNetworks.forEach(n => networks.add(n));
        }

        return Array.from(networks).sort();
    }
}

module.exports = HomeParser;
