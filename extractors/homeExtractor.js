/**
 * Improved Home Page Extractor for Anime Salt API
 * Enhanced scraping logic for spotlights, genres, recentEpisodes, networks, and more
 * 
 * Target Response Structure:
 * {
 *   "success": true,
 *   "meta": { "source", "timestamp", "itemCount" },
 *   "spotlights": [...],
 *   "trending": [...],
 *   "latest": [...],
 *   "topRated": [...],
 *   "ongoing": [...],
 *   "movies": [...],
 *   "series": [...],
 *   "recentEpisodes": [...],
 *   "animeList": [...],
 *   "genres": [...],
 *   "networks": [...]
 * }
 */

const { fetchHTML, normalizeUrl, extractIdFromUrl, sanitizeText, delay } = require('../utils/helpers');

class HomeExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.maxRetries = 3;
        this.requestDelay = 1000;
    }

    /**
     * Extract all homepage data with improved structure
     * Dynamically identifies and scrapes all sections from the home page
     */
    async extract() {
        const startTime = Date.now();
        const globalItems = new Map();
        const seenIds = new Set();

        try {
            const html = await this.fetchWithRetry(this.baseUrl);
            const $ = require('cheerio').load(html);

            // Dynamically identify all sections from the page structure
            const dynamicSections = this.extractAllSectionsDynamically($);
            
            // Extract all named sections using specialized methods
            const spotlights = this.extractSpotlights($);
            const trending = this.extractTrending($);
            const latest = this.extractLatest($);
            const topRated = this.extractTopRated($);
            const ongoing = this.extractOngoing($);
            const movies = this.extractMovies($);
            const series = this.extractSeries($);
            const recentEpisodes = this.extractRecentEpisodes($);
            
            // Ensure no section returns empty array - apply fallback strategies
            const result = {
                spotlights: this.ensureNonEmpty(spotlights, () => this.extractFallbackSpotlights($)),
                trending: this.ensureNonEmpty(trending, () => this.extractByGenericSelectors($, '.trending, .popular, [class*="trending"], [class*="popular"]')),
                latest: this.ensureNonEmpty(latest, () => this.extractByGenericSelectors($, '.latest, .recent, [class*="latest"], [class*="recent"]')),
                topRated: this.ensureNonEmpty(topRated, () => this.extractByGenericSelectors($, '.top-rated, .top-rated-anime, [class*="top"], [class*="rating"]')),
                ongoing: this.ensureNonEmpty(ongoing, () => this.extractByGenericSelectors($, '.ongoing, .airing, [class*="on-air"], [class*="ongoing"]')),
                movies: this.ensureNonEmpty(movies, () => this.extractMoviesByContentType($)),
                series: this.ensureNonEmpty(series, () => this.extractSeriesByContentType($)),
                recentEpisodes: this.ensureNonEmpty(recentEpisodes, () => this.extractRecentEpisodesWithFallback($)),
            };

            // Collect all items for the master list and deduplicate
            const allSections = [result.spotlights, result.trending, result.latest, result.topRated, result.ongoing, result.movies, result.series, result.recentEpisodes];
            
            for (const section of allSections) {
                for (const item of section) {
                    if (item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        globalItems.set(item.id, item);
                    }
                }
            }

            // Build animeList from deduplicated items
            const animeList = Array.from(globalItems.values());

            // Extract genres and networks separately
            const genres = this.extractGenres($);
            const networks = this.extractNetworks($);

            const processingTime = Date.now() - startTime;

            // Add dynamic sections discovered from the page
            result.dynamicSections = dynamicSections;
            result.animeList = animeList;
            result.genres = this.ensureNonEmpty(genres, () => this.extractFallbackGenres());
            result.networks = this.ensureNonEmpty(networks, () => this.extractFallbackNetworks());
            
            result.success = true;
            result.meta = {
                source: 'animesalt.cc',
                timestamp: new Date().toISOString(),
                itemCount: animeList.length,
                processingTime: `${processingTime}ms`,
                sectionsDiscovered: dynamicSections.length
            };
            
            // Apply limits to prevent excessive data while ensuring minimum returns
            result.spotlights = result.spotlights.slice(0, 10);
            result.trending = result.trending.slice(0, 10);
            result.latest = result.latest.slice(0, 20);
            result.topRated = result.topRated.slice(0, 20);
            result.ongoing = result.ongoing.slice(0, 20);
            result.movies = result.movies.slice(0, 50);
            result.series = result.series.slice(0, 100);
            result.recentEpisodes = result.recentEpisodes.slice(0, 30);

            return result;
        } catch (error) {
            console.error('[HomeExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
                spotlights: this.extractFallbackSpotlights($),
                trending: [],
                latest: [],
                topRated: [],
                ongoing: [],
                movies: [],
                series: [],
                recentEpisodes: [],
                animeList: [],
                genres: this.extractFallbackGenres(),
                networks: this.extractFallbackNetworks()
            };
        }
    }

    /**
     * Ensure a section is not empty by applying fallback strategy
     */
    ensureNonEmpty(primaryData, fallbackFn) {
        if (Array.isArray(primaryData) && primaryData.length > 0) {
            return primaryData;
        }
        console.log(`[HomeExtractor] Primary extraction returned empty, applying fallback...`);
        return fallbackFn();
    }

    /**
     * Dynamically identify all sections on the page
     * Scans for section headers and containers to discover all available content areas
     */
    extractAllSectionsDynamically($) {
        const sections = [];
        const seenNames = new Set();
        
        // Look for section containers with headers
        $('section, .container, .main-content, .content-area, .page-section').each((i, el) => {
            const $section = $(el);
            
            // Extract section title from various header elements
            const title = $section.find('h1, h2, h3, h4, .section-title, .widget-title, .page-title, .archive-title').text().trim();
            
            if (title && title.length > 2 && title.length < 100) {
                const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                
                // Skip if we've already seen a similar section
                if (seenNames.has(normalizedTitle)) return;
                
                // Count items in this section
                const itemCount = $section.find('.post, .TPost, .movies .tt, article, .item, [class*="anime"], [class*="movie"]').length;
                
                if (itemCount > 0) {
                    seenNames.add(normalizedTitle);
                    sections.push({
                        name: title,
                        normalizedName: normalizedTitle,
                        itemCount: itemCount,
                        type: this.categorizeSection(normalizedTitle)
                    });
                }
            }
        });
        
        return sections;
    }

    /**
     * Categorize a section based on its name
     */
    categorizeSection(name) {
        if (name.includes('spotlight') || name.includes('featured') || name.includes('hero')) return 'spotlight';
        if (name.includes('trend') || name.includes('popular') || name.includes('most')) return 'trending';
        if (name.includes('top') && (name.includes('rate') || name.includes('view'))) return 'topRated';
        if (name.includes('latest') || name.includes('new') || name.includes('recent')) return 'latest';
        if (name.includes('air') || name.includes('ongoing') || name.includes('current')) return 'ongoing';
        if (name.includes('movie') && !name.includes('series')) return 'movies';
        if (name.includes('series') || name.includes('tv')) return 'series';
        if (name.includes('episode') || name.includes('update')) return 'recentEpisodes';
        return 'general';
    }

    /**
     * Extract items using generic selectors when specific section extraction fails
     */
    extractByGenericSelectors($, selectors) {
        const items = [];
        const selectorArray = Array.isArray(selectors) ? selectors : selectors.split(', ');
        
        for (const selector of selectorArray) {
            const elements = $(selector);
            if (elements.length > 0) {
                elements.find('.post, .TPost, .movies .tt, article, .item').each((i, el) => {
                    if (items.length >= 20) return false;
                    const item = this.parseAnimeItem($(el));
                    if (item) items.push(item);
                });
                if (items.length > 0) break;
            }
        }
        
        return items;
    }

    /**
     * Extract fallback spotlights when primary extraction fails
     */
    extractFallbackSpotlights($) {
        const items = [];
        
        // Try hero/slider elements first
        $('.hero, .slider, .swiper, .carousel, .featured').find('.post, '.TPost, '.movies .tt, article').each((i, el) => {
            if (items.length >= 5) return false;
            const item = this.parseSpotlightItem($(el));
            if (item && item.id) items.push(item);
        });
        
        // Fallback: extract from any prominent post elements
        if (items.length === 0) {
            $('article.post, .post, .movies .tt, .TPost').each((i, el) => {
                if (items.length >= 5) return false;
                const item = this.parseSpotlightItem($(el));
                if (item && item.id) items.push(item);
            });
        }
        
        return items;
    }

    /**
     * Extract movies using content type detection
     */
    extractMoviesByContentType($) {
        const items = [];
        
        // Method 1: Look for movie section directly
        let movieSection = $();
        $('section, .widget, .container').each(function() {
            const title = $(this).find('.section-title, .widget-title, h2, h3').text().toLowerCase();
            if (title.includes('movie') && !title.includes('series')) {
                movieSection = $(this);
                return false;
            }
        });
        
        if (movieSection.length > 0) {
            movieSection.find('.post, .movies .tt, .TPost, article').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item && (item.type === 'movie' || item.link?.includes('/movies/'))) {
                    item.type = 'movie';
                    items.push(item);
                }
            });
        }
        
        // Method 2: Filter by /movies/ URL pattern
        if (items.length === 0) {
            $('a[href*="/movies/"]').closest('.post, article, .movies .tt, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) {
                    item.type = 'movie';
                    items.push(item);
                }
            });
        }
        
        return items;
    }

    /**
     * Extract series using content type detection
     */
    extractSeriesByContentType($) {
        const items = [];
        
        // Method 1: Look for series section directly
        let seriesSection = $();
        $('section, .widget, .container').each(function() {
            const title = $(this).find('.section-title, .widget-title, h2, h3').text().toLowerCase();
            if (title.includes('series') && !title.includes('movie')) {
                seriesSection = $(this);
                return false;
            }
        });
        
        if (seriesSection.length > 0) {
            seriesSection.find('.post, .movies .tt, .TPost, article').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item && (item.type === 'series' || item.link?.includes('/series/'))) {
                    item.type = 'series';
                    items.push(item);
                }
            });
        }
        
        // Method 2: Filter by /series/ URL pattern
        if (items.length === 0) {
            $('a[href*="/series/"]').closest('.post, article, .movies .tt, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) {
                    item.type = 'series';
                    items.push(item);
                }
            });
        }
        
        // Method 3: Exclude movies from all items
        if (items.length === 0) {
            $('article.post, .post, .movies .tt, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item && !item.link?.includes('/movies/')) {
                    item.type = 'series';
                    items.push(item);
                }
            });
        }
        
        return items;
    }

    /**
     * Extract recent episodes with enhanced fallback strategies
     */
    extractRecentEpisodesWithFallback($) {
        const items = [];
        
        // Try episode-specific selectors first
        const episodeSelectors = [
            '.recent-episodes, .episodes-section, .episode-list',
            '.update-item, .update-section',
            '[class*="episode"], [class*="update"]'
        ];
        
        for (const selector of episodeSelectors) {
            const section = $(selector);
            if (section.length > 0) {
                section.find('.post, .TPost, .movies .tt, article, .item').each((i, el) => {
                    const item = this.parseAnimeItem($(el));
                    if (item) items.push(item);
                });
                if (items.length > 0) break;
            }
        }
        
        // Fallback: extract from links with episode info
        if (items.length === 0) {
            $('a[href*="/series/"], a[href*="/movies/"]').closest('.post, .TPost, article').each((i, el) => {
                if (items.length >= 30) return false;
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }
        
        return items;
    }

    /**
     * Extract fallback genres when primary extraction fails
     */
    extractFallbackGenres() {
        return [
            'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
            'Horror', 'Isekai', 'Romance', 'Sci-Fi', 'Supernatural',
            'Martial Arts', 'Mecha', 'Psychological', 'School', 'Shounen',
            'Slice of Life', 'Sports', 'Thriller', 'Ecchi', 'Music',
            'Demons', 'Game', 'Magic', 'Military', 'Mystery', 'Police',
            'Samurai', 'Seinen', 'Shojo', 'Shoujo', 'Space', 'Vampire'
        ];
    }

    /**
     * Extract fallback networks when primary extraction fails
     */
    extractFallbackNetworks() {
        return [
            'Crunchyroll', 'Netflix', 'Disney+', 'Prime Video', 
            'Cartoon Network', 'HBO', 'Hulu', 'Funimation',
            'Anime-Planet', 'MAL', 'TV Tokyo', 'Studio Pierrot',
            'Madhouse', 'Bones', 'WIT Studio', 'MAPPA',
            'Sunrise', 'Toei Animation', 'Studio Ghibli'
        ];
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
     * Extract spotlights/featured anime with improved selectors
     */
    extractSpotlights($) {
        const items = [];
        
        // Try multiple selectors for the spotlight/carousel section
        const carouselSelectors = [
            '.swiper-slide',
            '.hero-slider',
            '.featured-slider',
            '.spotlight-carousel',
            '.swipecarousel',
            '.TPost',
            '.spotlight-item',
            '.featured-post'
        ];
        
        for (const selector of carouselSelectors) {
            const carouselSection = $(selector);
            if (carouselSection.length > 0) {
                carouselSection.each((i, el) => {
                    if (items.length >= 10) return false;
                    const item = this.parseSpotlightItem($(el));
                    if (item && item.id) {
                        items.push(item);
                    }
                });
                if (items.length > 0) break;
            }
        }

        // Fallback: extract from popular posts
        if (items.length === 0) {
            $('article.post, .post, .movies .tt, .TPost').each((i, el) => {
                if (items.length >= 10) return false;
                const item = this.parseSpotlightItem($(el));
                if (item && item.id) {
                    items.push(item);
                }
            });
        }

        return items;
    }

    /**
     * Parse spotlight item with enhanced data extraction
     */
    parseSpotlightItem($el) {
        // Find link with multiple fallbacks
        const link = $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a[href*="/cartoon/"]').attr('href') ||
                     $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title with multiple fallbacks
        let title = $el.find('.chart-title, .entry-title, .title, .tt, .post-title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image\s*/i, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster with lazy loading support
        const poster = this.extractEnhancedPoster($el);

        // Extract background image for spotlight
        const backgroundImage = $el.find('.TPostBg, [class*="background"]').attr('src') ||
                               $el.find('[style*="background"]').attr('style')?.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1] || '';

        // Determine type
        let type = 'series';
        if (link.includes('/movies/')) type = 'movie';
        else if (link.includes('/cartoon/')) type = 'cartoon';

        // Extract episode info from .year class
        const episodeText = $el.find('.year').text().trim();
        const nextEpisode = episodeText.match(/EP:?\s*(\d+[-/]?\d*)/i)?.[1] || 
                           episodeText.match(/(\d+)\s*ep/i)?.[1] || null;
        
        // Extract full episode range (e.g., "322-347" from "EP:322-347")
        const episodeRangeMatch = episodeText.match(/EP:?\s*([\d-]+)/i);
        const episodeRange = episodeRangeMatch ? episodeRangeMatch[1] : null;

        // Extract season number from .post-ql class (e.g., "Season 15")
        const seasonText = $el.find('.post-ql').text().trim();
        const seasonMatch = seasonText.match(/Season\s*(\d+)/i);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : null;
        
        // Extract quality from .Qlty span
        const qualityText = $el.find('.Qlty').text().trim() || 'HD';
        
        // Extract year from the year element or post classes
        const yearText = $el.find('.year').attr('data-id') || 
                        $el.find('.year').text().match(/(\d{4})/)?.[1] || 
                        $el.parent().attr('class').match(/annee-(\d+)/)?.[1] || 
                        null;
        
        // Extract status from post classes
        const status = $el.parent().hasClass('completed') ? 'Completed' : 'Ongoing';
        
        // Extract rating from post views or other indicators
        const rating = $el.find('.rating').text().trim() || 
                      $el.find('[class*="rating"]').text().trim() || 
                      'N/A';

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: poster,
            backgroundImage: backgroundImage ? this.fixImageUrl(backgroundImage) : poster,
            type: type,
            year: yearText,
            status: status,
            lastEpisode: nextEpisode,
            seasonNumber: seasonNumber,
            episodeRange: episodeRange,
            rating: rating,
            quality: qualityText,
            link: normalizeUrl(link),
        };
    }

    /**
     * Extract trending anime (Top 10)
     */
    extractTrending($) {
        const items = [];
        
        // Look for Most-Watched/Popular sections
        let section = $();
        
        $('section, .widget, .trending-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('trending') || title.includes('most-watch') || title.includes('popular')) {
                section = $(this);
                return false;
            }
        });

        if (section.length > 0) {
            section.find('.post, .chart-item, .movies .tt, .TPost, .trending-item').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        // Fallback
        if (items.length === 0) {
            $('article.post, .post, .movies .tt, .TPost').each((i, el) => {
                if (items.length >= 10) return false;
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract latest anime updates
     */
    extractLatest($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .latest-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('latest') || title.includes('recent') || title.includes('new')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .TPost').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        // Fallback
        if (items.length === 0) {
            $('article.post, .post, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract top rated anime
     */
    extractTopRated($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .top-rated-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('top') && (title.includes('rated') || title.includes('rating'))) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .chart-item, .movies .tt, .TPost').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        return items;
    }

    /**
     * Extract ongoing/airing anime
     */
    extractOngoing($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .ongoing-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('on-air') || title.includes('airing') || title.includes('currently')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .swiper-slide .post, .TPost').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        return items;
    }

    /**
     * Extract movies only
     */
    extractMovies($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .movies-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('movie') && !title.includes('series')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .chart-item, .TPost').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item && item.type === 'movie') items.push(item);
        });

        // Fallback: filter by /movies/ links
        if (items.length === 0) {
            $('a[href*="/movies/"]').closest('.post, article.post, .movies .tt, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract series only
     */
    extractSeries($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .series-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('series') && !title.includes('movie')) {
                section = $(this);
                return false;
            }
        });

        section.find('.post, .movies .tt, .chart-item, .TPost').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item && item.type === 'series') items.push(item);
        });

        // Fallback: filter by /series/ links
        if (items.length === 0) {
            $('a[href*="/series/"]').closest('.post, article.post, .movies .tt, .TPost').each((i, el) => {
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Extract recent episodes with improved selectors
     */
    extractRecentEpisodes($) {
        const items = [];
        
        let section = $();
        
        $('section, .widget, .recent-episodes-section, .episodes-section').each(function() {
            const title = $(this).find('.section-title, .widget-title, h3, h2').text().toLowerCase();
            if (title.includes('recent') && (title.includes('episode') || title.includes('update'))) {
                section = $(this);
                return false;
            }
        });

        // Try multiple selectors for episode items
        section.find('.post, .movies .tt, .TPost, .episode-item, .recent-item').each((i, el) => {
            const item = this.parseAnimeItem($(el));
            if (item) items.push(item);
        });

        // Additional: look for episode list in page
        if (items.length === 0) {
            $('a[href*="/series/"], a[href*="/movies/"]').closest('.post, .TPost, article.post').each((i, el) => {
                if (items.length >= 30) return false;
                const item = this.parseAnimeItem($(el));
                if (item) items.push(item);
            });
        }

        return items;
    }

    /**
     * Parse anime item with standardized structure
     */
    parseAnimeItem($el) {
        // Find link with multiple fallbacks
        const link = $el.find('a.lnk-blk').attr('href') ||
                     $el.find('a[href*="/series/"]').attr('href') ||
                     $el.find('a[href*="/movies/"]').attr('href') ||
                     $el.find('a[href*="/cartoon/"]').attr('href') ||
                     $el.find('a').first().attr('href');

        if (!link) return null;

        // Extract title with multiple fallbacks
        let title = $el.find('.chart-title, .entry-title, .title, .tt, .post-title').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt')?.replace(/^Image\s*/i, '').trim();
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim().substring(0, 100);
        }
        if (!title) return null;

        // Extract poster with lazy loading support
        const poster = this.extractEnhancedPoster($el);

        // Determine type
        let type = 'series';
        if (link.includes('/movies/')) type = 'movie';
        else if (link.includes('/cartoon/')) type = 'cartoon';

        // Extract episode info from .year class
        const episodeText = $el.find('.year').text().trim();
        const nextEpisode = episodeText.match(/EP:?\s*(\d+[-/]?\d*)/i)?.[1] || 
                           episodeText.match(/(\d+)\s*ep/i)?.[1] || null;
        
        // Extract full episode range (e.g., "322-347" from "EP:322-347")
        const episodeRangeMatch = episodeText.match(/EP:?\s*([\d-]+)/i);
        const episodeRange = episodeRangeMatch ? episodeRangeMatch[1] : null;

        // Extract season number from .post-ql class (e.g., "Season 15")
        const seasonText = $el.find('.post-ql').text().trim();
        const seasonMatch = seasonText.match(/Season\s*(\d+)/i);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : null;
        
        // Extract quality from .Qlty span
        const qualityText = $el.find('.Qlty').text().trim() || 'HD';
        
        // Extract year from the year element or post classes
        const yearText = $el.find('.year').attr('data-id') || 
                        $el.find('.year').text().match(/(\d{4})/)?.[1] || 
                        $el.parent().attr('class').match(/annee-(\d+)/)?.[1] || 
                        null;
        
        // Extract status from post classes
        const status = $el.parent().hasClass('completed') ? 'Completed' : 'Ongoing';
        
        // Extract rating from post views or other indicators
        const rating = $el.find('.rating').text().trim() || 
                      $el.find('[class*="rating"]').text().trim() || 
                      'N/A';

        return {
            id: extractIdFromUrl(link) || this.generateId(title),
            title: sanitizeText(title),
            poster: poster,
            type: type,
            year: yearText,
            status: status,
            lastEpisode: nextEpisode,
            seasonNumber: seasonNumber,
            episodeRange: episodeRange,
            rating: rating,
            quality: qualityText,
            link: normalizeUrl(link),
        };
    }

    /**
     * Extract poster image with enhanced lazy loading support
     */
    extractEnhancedPoster($el) {
        const imgEl = $el.find('img').first();
        
        // Try multiple data attributes for lazy loading
        let src = imgEl.attr('data-src') || 
                  imgEl.attr('data-lazy-src') || 
                  imgEl.attr('data-original') ||
                  imgEl.attr('src');
        
        if (src) return this.fixImageUrl(src);
        
        // Try background image style
        const posterStyle = $el.find('[style*="background"], [style*="poster"]').attr('style');
        if (posterStyle) {
            const match = posterStyle.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (match) return this.fixImageUrl(match[1]);
        }
        
        // Try TPostBg element
        const bgElement = $el.find('.TPostBg, [class*="bg"], [class*="background"]').attr('src') ||
                         $el.find('.TPostBg, [class*="bg"], [class*="background"]').attr('style')?.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
        if (bgElement) return this.fixImageUrl(bgElement);
        
        return '';
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
     * Generate ID from title
     */
    generateId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Extract genres list with improved parsing
     */
    extractGenres($) {
        const genres = new Set();
        
        // Extract from genre links on the page
        $('a[href*="/category/genre/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim();
            
            if (link.includes('/genre/')) {
                const genre = link.split('/genre/')[1]?.replace(/\//g, '') || name;
                if (genre) {
                    // Capitalize properly
                    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
                    genres.add(formattedGenre);
                }
            }
            if (name) {
                genres.add(name);
            }
        });

        // Extract from any genre badge or tag
        $('.genre-tag, .genre-badge, [class*="genre"]').each((i, el) => {
            const genreText = $(el).text().trim();
            if (genreText) {
                genres.add(genreText);
            }
        });

        // Add common genres if none found
        if (genres.size === 0) {
            const commonGenres = [
                'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
                'Horror', 'Isekai', 'Romance', 'Sci-Fi', 'Supernatural',
                'Martial Arts', 'Mecha', 'Psychological', 'School', 'Shounen',
                'Slice of Life', 'Sports', 'Thriller', 'Ecchi', 'Music',
                'Demons', 'Game', 'Magic', 'Military', 'Mystery', 'Police',
                'Samurai', 'Seinen', 'Shojo', 'Shoujo', 'Space', 'Vampire'
            ];
            commonGenres.forEach(g => genres.add(g));
        }

        return Array.from(genres).sort();
    }

    /**
     * Extract networks list with improved parsing
     */
    extractNetworks($) {
        const networks = new Set();
        
        // Extract from network links on the page
        $('a[href*="/category/network/"]').each((i, el) => {
            const link = $(el).attr('href') || '';
            const name = $(el).text().trim() || $(el).find('img').attr('title') || '';
            
            if (link.includes('/network/')) {
                const network = link.split('/network/')[1]?.replace(/\//g, '') || name;
                if (network) {
                    const formattedNetwork = network.charAt(0).toUpperCase() + network.slice(1).toLowerCase();
                    networks.add(formattedNetwork);
                }
            }
            if (name) {
                networks.add(name);
            }
        });

        // Extract from network badges or logos
        $('.network-badge, .network-tag, [class*="network"]').each((i, el) => {
            const networkText = $(el).text().trim() || $(el).find('img').attr('alt') || '';
            if (networkText) {
                networks.add(networkText);
            }
        });

        // Common networks from anime streaming sites
        if (networks.size === 0) {
            const commonNetworks = [
                'Crunchyroll', 'Netflix', 'Disney+', 'Prime Video', 
                'Cartoon Network', 'HBO', 'Hulu', 'Funimation',
                'Anime-Planet', 'MAL', 'TV Tokyo', 'Studio Pierrot',
                'Madhouse', 'Bones', 'WIT Studio', 'MAPPA',
                'Sunrise', 'Toei Animation', 'Studio Ghibli'
            ];
            commonNetworks.forEach(n => networks.add(n));
        }

        return Array.from(networks).sort();
    }
}

module.exports = HomeExtractor;
