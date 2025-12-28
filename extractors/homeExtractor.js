/**
 * Home Page Extractor for Anime Salt API
 * Extracts all homepage data including spotlights, trending, top series, etc.
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, sanitizeText } = require('../utils/helpers');
const SELECTORS = require('../utils/constants').SELECTORS;

class HomeExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract all homepage data
     */
    async extract() {
        try {
            const html = await fetchHTML(this.baseUrl);
            const $ = require('cheerio').load(html);

            const results = {
                spotlights: await this.extractSpotlights($),
                trending: await this.extractTrending($),
                topSeries: await this.extractTopSeries($),
                topMovies: await this.extractTopMovies($),
                recentEpisodes: await this.extractRecentEpisodes($),
                networks: await this.extractNetworks($),
                languages: await this.extractLanguages($),
                genres: await this.extractGenres($),
                freshDrops: await this.extractFreshDrops($),
                upcoming: await this.extractUpcoming($),
                onAir: await this.extractOnAir($),
                latestMoviesSeries: await this.extractLatestMoviesSeries($),
                freshCartoonFilms: await this.extractFreshCartoonFilms($),
            };

            return {
                success: true,
                data: results,
            };
        } catch (error) {
            console.error('[HomeExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Extract spotlight/featured anime
     */
    async extractSpotlights($) {
        const spotlights = [];
        
        $(SELECTORS.home.spotlight).each((i, el) => {
            const $el = $(el);
            const link = $el.find('a').attr('href');
            const title = $el.find('.title, .slide-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            
            if (title && link) {
                spotlights.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    japanese_title: '',
                    description: $el.find('.description, .synopsis').text().trim() || '',
                    tvInfo: {
                        showType: 'TV',
                        duration: '24 min',
                        quality: 'HD',
                    },
                });
            }
        });

        return spotlights;
    }

    /**
     * Extract trending anime (top 10 chart)
     */
    async extractTrending($) {
        const trending = [];
        
        $(SELECTORS.home.trending).each((i, el) => {
            const $el = $(el);
            const link = $el.find('.chart-poster').attr('href');
            const title = $el.find('.chart-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const number = $el.find('.chart-number').text().trim();
            
            if (title && link) {
                trending.push({
                    id: extractIdFromUrl(link),
                    number: parseInt(number) || (i + 1),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    japanese_title: '',
                });
            }
        });

        return trending.slice(0, 10);
    }

    /**
     * Extract top series (50 items)
     */
    async extractTopSeries($) {
        const topSeries = [];
        
        $(SELECTORS.home.trending).each((i, el) => {
            const $el = $(el);
            const link = $el.find('.chart-poster').attr('href');
            const title = $el.find('.chart-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const number = $el.find('.chart-number').text().trim();
            
            if (title && link) {
                topSeries.push({
                    id: extractIdFromUrl(link),
                    number: parseInt(number) || (i + 1),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    japanese_title: '',
                });
            }
        });

        return topSeries;
    }

    /**
     * Extract top movies (50 items)
     */
    async extractTopMovies($) {
        const topMovies = [];
        
        $(SELECTORS.home.topMovies).each((i, el) => {
            const $el = $(el);
            const link = $el.find('.chart-poster').attr('href');
            const title = $el.find('.chart-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const number = $el.find('.chart-number').text().trim();
            
            if (title && link) {
                topMovies.push({
                    id: extractIdFromUrl(link),
                    number: parseInt(number) || (i + 1),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    japanese_title: '',
                    showType: 'Movie',
                });
            }
        });

        return topMovies;
    }

    /**
     * Extract recent episodes
     */
    async extractRecentEpisodes($) {
        const recentEpisodes = [];
        
        $(SELECTORS.home.recentEpisodes).each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').attr('href');
            const title = $el.find('.entry-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const episode = $el.find('.num-epi, .episode').text().trim();
            
            if (title && link) {
                recentEpisodes.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    episode: episode,
                });
            }
        });

        return recentEpisodes.slice(0, 20);
    }

    /**
     * Extract network/studio logos
     */
    async extractNetworks($) {
        const networks = [];
        
        $(SELECTORS.home.networks).each((i, el) => {
            const $el = $(el);
            const link = $el.attr('href');
            const logo = getImageUrl($el.find('img'));
            const name = $el.attr('title') || $el.find('img').attr('alt');
            
            if (link && name) {
                networks.push({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name: sanitizeText(name),
                    logo: logo,
                    link: normalizeUrl(link),
                });
            }
        });

        return networks;
    }

    /**
     * Extract available languages
     */
    async extractLanguages($) {
        const languages = [];
        
        $(SELECTORS.home.languages).each((i, el) => {
            const $el = $(el);
            const lang = $el.attr('data-lang');
            const name = $el.attr('data-name');
            const native = $el.attr('data-native');
            
            if (lang && name) {
                languages.push({
                    code: lang.replace('/category/language/', ''),
                    name: sanitizeText(name),
                    native: sanitizeText(native || ''),
                    link: normalizeUrl(lang + '/'),
                });
            }
        });

        return languages;
    }

    /**
     * Extract available genres
     */
    async extractGenres($) {
        const genres = [];
        
        $('a[href*="/category/genre/"]').each((i, el) => {
            const link = $(el).attr('href');
            const name = $(el).text().trim();
            
            if (name && link && !genres.find(g => g.name === name)) {
                genres.push({
                    name: sanitizeText(name),
                    link: normalizeUrl(link),
                });
            }
        });

        return genres;
    }

    /**
     * Extract Fresh Drops (Fresh Dubs) section
     */
    async extractFreshDrops($) {
        const freshDrops = [];
        
        // Try multiple selector patterns for Fresh Dubs sections
        let container = $('#widget_block-8');
        
        // If not found by ID, search for Fresh Dubs section by title
        if (container.length === 0) {
            $('section').each(function() {
                if ($(this).find('.section-title').text().toLowerCase().includes('fresh dubs')) {
                    container = $(this);
                    return false;
                }
            });
        }
        
        const items = container.length ? container.find('.post') : $('article.post');
        
        items.each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() || 
                          $el.find('img').attr('alt')?.replace(/^Image /, '') || 
                          $el.find('.title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            
            if (title && link) {
                freshDrops.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    quality: quality || 'HD',
                });
            }
        });

        return freshDrops.slice(0, 20);
    }

    /**
     * Extract Upcoming section
     */
    async extractUpcoming($) {
        const upcoming = [];
        
        // Look for sections with "Upcoming" in the title using filter() instead of :has()
        let section = $();
        $('h3.section-title').each(function() {
            if ($(this).text().toLowerCase().includes('upcoming')) {
                section = $(this).closest('section');
                return false;
            }
        });
        
        if (section.length === 0) {
            // Try finding by iterating through all sections
            $('section').each(function() {
                if ($(this).find('h3.section-title').text().toLowerCase().includes('upcoming')) {
                    section = $(this);
                    return false;
                }
            });
            return section.length ? this.extractSectionItems(section, $) : [];
        }
        
        return this.extractSectionItems(section, $);
    }

    /**
     * Extract On Air (Currently Airing) section
     */
    async extractOnAir($) {
        const onAir = [];
        
        // Look for sections with "On-Air", "On Air", "Currently Airing" in the title
        // The text might be inside an <a> tag within the h3
        let section = $();
        $('h3.section-title').each(function() {
            const $h3 = $(this);
            // Check both h3 text and text inside any <a> tags within h3
            const h3Text = $h3.text().toLowerCase();
            const aText = $h3.find('a').text().toLowerCase();
            const combinedText = (h3Text + ' ' + aText).toLowerCase();
            
            if (combinedText.includes('on-air') || combinedText.includes('on air') || 
                combinedText.includes('currently airing') || combinedText.includes('airing')) {
                section = $h3.closest('section');
                return false;
            }
        });
        
        if (section.length === 0) {
            // Try alternative approach - search all section titles
            $('section').each(function() {
                const $sec = $(this);
                const h3Text = $sec.find('h3.section-title').text().toLowerCase();
                const aText = $sec.find('h3.section-title a').text().toLowerCase();
                const combinedText = (h3Text + ' ' + aText).toLowerCase();
                
                if (combinedText.includes('on-air') || combinedText.includes('on air') || 
                    combinedText.includes('airing')) {
                    section = $sec;
                    return false;
                }
            });
        }
        
        if (section.length === 0) {
            return onAir;
        }
        
        // Extract items from the section
        section.find('.swiper-slide .post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() || 
                          $el.find('img').attr('alt')?.replace(/^Image /, '') || 
                          $el.find('.title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            
            if (title && link) {
                onAir.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    quality: quality || 'HD',
                });
            }
        });

        return onAir.slice(0, 20);
    }

    /**
     * Helper method to extract items from a section
     */
    extractSectionItems(container, $) {
        const items = [];
        
        container.find('.post, article.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('.entry-title').text().trim() || 
                          $el.find('img').attr('alt')?.replace(/^Image /, '') || 
                          $el.find('.title').text().trim();
            const poster = getImageUrl($el.find('img'));
            const quality = $el.find('.Qlty').text().trim();
            const year = $el.find('.year').text().trim();
            
            if (title && link) {
                items.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    quality: quality || 'HD',
                    year: year || '',
                });
            }
        });

        return items.slice(0, 20);
    }

    /**
     * Extract latest movies and series
     */
    async extractLatestMoviesSeries($) {
        const latest = [];
        
        // Look for the latest movies/series swiper section
        let section = $();
        
        // Try by ID first
        section = $('#widget_list_movies_series-11');
        
        // If not found, search by section title text
        if (section.length === 0) {
            $('section').each(function() {
                if ($(this).find('.section-title').text().includes('Latest Movies & Series')) {
                    section = $(this);
                    return false;
                }
            });
        }
        
        if (section.length === 0) {
            return [];
        }
        
        section.find('.swiper-slide .post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href');
            const title = $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.entry-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            
            if (title && link) {
                latest.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                });
            }
        });

        return latest.slice(0, 20);
    }

    /**
     * Extract Fresh Cartoon Films section
     */
    async extractFreshCartoonFilms($) {
        const cartoons = [];
        
        // Look for Fresh Cartoon Films section
        let section = $();
        
        // First try to find by class
        section = $('section.movies');
        
        // If not found, search by section title text
        if (section.length === 0) {
            $('section').each(function() {
                if ($(this).find('.section-title').text().toLowerCase().includes('fresh cartoon')) {
                    section = $(this);
                    return false;
                }
            });
        }
        
        // Find the swiper slides container
        const swiperSlides = section.find('.swiper-slide');
        
        swiperSlides.find('.post').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a.lnk-blk').attr('href');
            const title = $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                          $el.find('.entry-title').text().trim();
            const poster = getImageUrl($el.find('img'));
            
            if (title && link) {
                cartoons.push({
                    id: extractIdFromUrl(link),
                    title: sanitizeText(title),
                    poster: poster,
                    link: normalizeUrl(link),
                    type: 'cartoon',
                });
            }
        });

        return cartoons.slice(0, 20);
    }
}

module.exports = HomeExtractor;
