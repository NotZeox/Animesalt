/**
 * Category Extractor for Anime Salt API
 * Handles category, letter, genre, and listing pages with comprehensive scraping
 * Aligned with animesalt.cc structure and itzzzzme/anime-api reference format
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, sanitizeText, delay } = require('../utils/helpers');

class CategoryExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.maxRetries = 3;
        this.requestDelay = 1000;
    }

    /**
     * Extract category/letter/genre page data with pagination
     * @param {string} type - Type of page: 'category', 'letter', 'genre', 'language'
     * @param {string} value - Category name, letter, or filter value
     * @param {object} options - Options including page number, page size
     */
    async extract(type, value, options = {}) {
        const page = options.page || 1;
        const pageSize = options.pageSize || 20;

        try {
            const url = this.buildUrl(type, value, page);
            const html = await this.fetchWithRetry(url);
            const $ = require('cheerio').load(html);

            const items = this.extractItems($);
            const pagination = this.extractPagination($, page);

            // Calculate total pages based on items count and page size
            const totalItems = this.estimateTotalItems($);
            const totalPages = Math.ceil(totalItems / pageSize) || pagination.totalPages || 1;

            const data = {
                type: type,
                value: value,
                page: page,
                pageSize: pageSize,
                totalItems: totalItems,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                items: items,
                links: this.extractPageLinks($, type, value, page, totalPages),
            };

            return {
                success: true,
                data: data,
            };
        } catch            console.error(` (error) {
[CategoryExtractor] Error extracting ${type}/${value}:`, error.message);
            return {
                success: false,
                error: error.message,
                type: type,
                value: value,
                page: page,
            };
        }
    }

    /**
     * Build URL based on type and value
     */
    buildUrl(type, value, page = 1) {
        let path = '';
        const encodedValue = encodeURIComponent(value.toLowerCase());

        switch (type) {
            case 'category':
                path = `/category/${encodedValue}/`;
                break;
            case 'letter':
                path = `/letter/${value.toUpperCase()}/`;
                break;
            case 'genre':
                path = `/category/genre/${encodedValue}/`;
                break;
            case 'language':
                path = `/category/language/${encodedValue}/`;
                break;
            case 'sub-category':
                path = `/category/${type}/${encodedValue}/`;
                break;
            case 'network':
                path = `/category/network/${encodedValue}/`;
                break;
            case 'studio':
                path = `/category/studio/${encodedValue}/`;
                break;
            case 'type':
                path = `/category/post-type/${encodedValue}/`;
                break;
            case 'country':
                path = `/category/country/${encodedValue}/`;
                break;
            case 'year':
                path = `/year/${value}/`;
                break;
            case 'season':
                path = `/season/${value.toLowerCase()}/`;
                break;
            case 'quality':
                path = `/quality/${value.toLowerCase()}/`;
                break;
            case 'status':
                path = `/status/${value.toLowerCase()}/`;
                break;
            case 'az':
                path = `/az-list/${value.toLowerCase()}/`;
                break;
            default:
                path = `/${type}/${encodedValue}/`;
        }

        // Add pagination parameter
        if (page > 1) {
            path += `page/${page}/`;
        }

        return `${this.baseUrl}${path}`;
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
     * Extract all anime/movie items from the page
     */
    extractItems($) {
        const items = [];
        const seenIds = new Set();

        // Try multiple selectors for different page layouts on animesalt.cc
        const itemSelectors = [
            '.film-list .film-item',
            '.posts .post',
            '.movies .movie-item',
            '.series .series-item',
            '.browse-movie-item',
            '.media-item',
            '.video-item',
            '.items .item',
            '.anime-item',
            '.movie-card',
            '.series-card',
            '.film-card',
            '.card .card-item',
            '.list-item',
            '.item-article',
            'article.post',
            '.post-article',
            '.archive-item',
        ];

        // Find the best matching container
        let container = null;
        let containerName = '';

        for (const selector of itemSelectors) {
            const $container = $(selector);
            if ($container.length > 0) {
                container = $container;
                containerName = selector;
                break;
            }
        }

        // If no container found, try to find links and work backwards
        if (!container || container.length === 0) {
            this.extractItemsFromLinks($, items, seenIds);
        } else {
            container.each((i, el) => {
                const item = this.parseItem($, $(el));
                if (item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    items.push(item);
                }
            });
        }

        // If still no items, try alternative extraction
        if (items.length === 0) {
            this.extractItemsFromLinks($, items, seenIds);
        }

        return items;
    }

    /**
     * Extract items from anchor links when container approach fails
     */
    extractItemsFromLinks($, items, seenIds) {
        // Find all anime/movie links
        const linkSelectors = [
            'a[href*="/series/"]',
            'a[href*="/movie/"]',
            'a[href*="/watch/"]',
            'a[href*="/anime/"]',
        ];

        for (const selector of linkSelectors) {
            $(selector).each((i, el) => {
                if (i >= 100) return; // Limit to first 100 to avoid duplicates

                const $el = $(el);
                const href = $el.attr('href');
                if (!href) return;

                const id = extractIdFromUrl(href);
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    const item = this.parseItemFromLink($, $el, href, id);
                    if (item.id && item.title) {
                        items.push(item);
                    }
                }
            });
        }
    }

    /**
     * Parse individual item from element
     */
    parseItem($, $el) {
        // Get link from element or its children
        let link = $el.find('a[href*="/series/"], a[href*="/movie/"], a[href*="/watch/"], a[href*="/anime/"]').attr('href');
        if (!link) {
            link = $el.attr('href');
        }

        if (!link) {
            return this.createEmptyItem();
        }

        const id = extractIdFromUrl(link);
        if (!id) {
            return this.createEmptyItem();
        }

        return this.parseItemFromLink($, $el, link, id);
    }

    /**
     * Parse item from link element
     */
    parseItemFromLink($, $el, link, id) {
        // Get title from multiple sources
        let title = this.extractTitle($, $el);

        // Get poster image
        let poster = getImageUrl($el.find('img').first());
        if (!poster) {
            poster = getImageUrl($el);
        }

        // Determine type
        const type = this.determineContentType(link);

        // Extract additional metadata
        const metadata = this.extractMetadata($, $el);

        return {
            id: id,
            slug: id,
            title: title,
            name: title,
            poster: poster,
            thumbnail: poster,
            image: poster,
            type: type,
            link: normalizeUrl(link),
            url: normalizeUrl(link),
            year: metadata.year,
            releaseDate: metadata.releaseDate,
            status: metadata.status,
            genres: metadata.genres,
            genre: metadata.genres,
            rating: metadata.rating,
            quality: metadata.quality,
            dubStatus: metadata.dubStatus,
            subTitle: metadata.subTitle,
            otherNames: metadata.otherNames,
            synopsis: metadata.synopsis,
            duration: metadata.duration,
            studio: metadata.studio,
            network: metadata.network,
            country: metadata.country,
            episodes: metadata.episodes,
            views: metadata.views,
        };
    }

    /**
     * Extract title from element
     */
    extractTitle($, $el) {
        // Try various title selectors
        const titleSelectors = [
            '.entry-title',
            '.movie-title',
            '.video-title',
            '.film-title',
            '.title',
            '.name',
            'h3',
            'h4',
            'h2',
            '.card-title',
            '.item-title',
            '.post-title',
        ];

        for (const selector of titleSelectors) {
            const $title = $el.find(selector);
            if ($title.length > 0) {
                const text = $title.text().trim();
                if (text && text.length > 2) {
                    return sanitizeText(text);
                }
            }
        }

        // Try image alt attribute
        const altText = $el.find('img').attr('alt');
        if (altText) {
            return sanitizeText(altText);
        }

        // Try direct text content
        const directText = $el.clone().children().remove().end().text().trim();
        if (directText && directText.length > 2) {
            return sanitizeText(directText);
        }

        return 'Unknown';
    }

    /**
     * Determine content type from URL
     */
    determineContentType(link) {
        if (!link) return 'series';

        const linkLower = link.toLowerCase();
        if (linkLower.includes('/movie/') || linkLower.includes('/movies/')) {
            return 'movie';
        } else if (linkLower.includes('/ONA'.toLowerCase()) || linkLower.includes('/ona/')) {
            return 'ona';
        } else if (linkLower.includes('/OVA'.toLowerCase()) || linkLower.includes('/ova/')) {
            return 'ova';
        } else if (linkLower.includes('/special/')) {
            return 'special';
        } else {
            return 'series';
        }
    }

    /**
     * Extract metadata from element
     */
    extractMetadata($, $el) {
        const text = $el.text().toLowerCase();
        const metadata = {
            year: '',
            releaseDate: '',
            status: '',
            genres: [],
            rating: '',
            quality: 'HD',
            dubStatus: '',
            subTitle: '',
            otherNames: [],
            synopsis: '',
            duration: '',
            studio: '',
            network: '',
            country: '',
            episodes: 0,
            views: '',
        };

        // Extract year
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            metadata.year = yearMatch[0];
        }

        // Extract quality
        if (text.includes('1080p') || text.includes('full hd')) {
            metadata.quality = '1080p';
        } else if (text.includes('720p')) {
            metadata.quality = '720p';
        } else if (text.includes('480p')) {
            metadata.quality = '480p';
        } else if (text.includes('4k')) {
            metadata.quality = '4K';
        }

        // Extract dub/sub status
        if (text.includes('dub') || $el.find('.dub, .dubbed').length > 0) {
            metadata.dubStatus = 'Dubbed';
        } else if (text.includes('sub') || $el.find('.sub, .subbed').length > 0) {
            metadata.dubStatus = 'Subbed';
        }

        // Extract episodes count
        const episodeMatch = text.match(/(\d+)\s*(?:eps?|episodes?|epi)/i);
        if (episodeMatch) {
            metadata.episodes = parseInt(episodeMatch[1]);
        }

        // Extract views
        const viewsMatch = text.match(/([\d,]+)\s*(?:views?|views)/i);
        if (viewsMatch) {
            metadata.views = viewsMatch[1].replace(/,/g, '');
        }

        // Extract duration
        const durationMatch = text.match(/(\d+)\s*(?:min|mins|minutes)/i);
        if (durationMatch) {
            metadata.duration = `${durationMatch[1]} min`;
        }

        return metadata;
    }

    /**
     * Create empty item placeholder
     */
    createEmptyItem() {
        return {
            id: '',
            title: '',
            poster: null,
            type: 'series',
            link: '',
        };
    }

    /**
     * Estimate total items from page
     */
    estimateTotalItems($) {
        // Try to find total count display
        const countSelectors = [
            '.result-count',
            '.total-count',
            '.items-count',
            '.count',
            '.page-count',
            '.showing',
        ];

        for (const selector of countSelectors) {
            const $count = $(selector);
            if ($count.length > 0) {
                const text = $count.text();
                const match = text.match(/(\d+)/);
                if (match) {
                    return parseInt(match[1]);
                }
            }
        }

        // Try to find pagination info
        const infoText = $('body').text();
        const match = infoText.match(/of\s+(\d+)|total[:\s]+(\d+)|(\d+)\s+results/i);
        if (match) {
            return parseInt(match[1] || match[2] || match[3]);
        }

        // Default estimate based on items found
        return this.extractItems($).length * 5;
    }

    /**
     * Extract pagination info
     */
    extractPagination($, currentPage) {
        const pagination = {
            currentPage: currentPage,
            hasNext: false,
            hasPrev: currentPage > 1,
            totalPages: 1,
            itemsPerPage: 20,
        };

        // Check for next page link
        const nextSelectors = [
            'a.next',
            'a.page-numbers.next',
            'a[rel="next"]',
            '.pagination .next a',
            '.paging .next a',
            '.wp-pagenavi .next',
            '.pagination a:last-child',
        ];

        for (const selector of nextSelectors) {
            const $next = $(selector);
            if ($next.length > 0 && $next.attr('href')) {
                pagination.hasNext = true;
                break;
            }
        }

        // Find total pages from pagination elements
        const totalPageSelectors = [
            '.pagination .total',
            '.paging .total',
            '.page-numbers:last',
            '.wp-pagenavi .last',
            '.pagination span:last',
        ];

        for (const selector of totalPageSelectors) {
            const $total = $(selector);
            if ($total.length > 0) {
                const text = $total.text().trim();
                const match = text.match(/(\d+)/);
                if (match) {
                    pagination.totalPages = parseInt(match[1]);
                    break;
                }
            }
        }

        // Try to count page links
        if (pagination.totalPages === 1) {
            const pageLinkSelectors = [
                'a.page-numbers',
                '.pagination a:not(.next):not(.prev)',
                '.paging a',
                '.wp-pagenavi a',
            ];

            for (const selector of pageLinkSelectors) {
                const $links = $(selector);
                if ($links.length > 10) {
                    pagination.totalPages = Math.max(pagination.totalPages, $links.length);
                    break;
                }
            }
        }

        return pagination;
    }

    /**
     * Extract page navigation links
     */
    extractPageLinks($, type, value, currentPage, totalPages) {
        const links = {
            first: null,
            last: null,
            next: null,
            prev: null,
            self: normalizeUrl(this.buildUrl(type, value, currentPage)),
        };

        if (totalPages > 1) {
            links.first = normalizeUrl(this.buildUrl(type, value, 1));
            links.last = normalizeUrl(this.buildUrl(type, value, totalPages));
            if (currentPage < totalPages) {
                links.next = normalizeUrl(this.buildUrl(type, value, currentPage + 1));
            }
            if (currentPage > 1) {
                links.prev = normalizeUrl(this.buildUrl(type, value, currentPage - 1));
            }
        }

        return links;
    }

    /**
     * Extract all available categories
     */
    async getCategories() {
        try {
            const url = `${this.baseUrl}/category/`;
            const html = await this.fetchWithRetry(url);
            const $ = require('cheerio').load(html);

            const categories = [];
            const seenSlugs = new Set();

            // Try multiple selectors for category links
            const categorySelectors = [
                'a[href*="/category/"]:not([href*="/language/"]):not([href*="/genre/"]):not([href*="/network/"]):not([href*="/studio/"]):not([href*="/post-type/"])',
                '.category-list a[href*="/category/"]',
                '.widget_categories a[href*="/category/"]',
                '.categories a[href*="/category/"]',
                'nav a[href*="/category/"]',
                '.menu a[href*="/category/"]',
            ];

            for (const selector of categorySelectors) {
                $(selector).each((i, el) => {
                    const $el = $(el);
                    const link = $el.attr('href');
                    let name = $el.text().trim();

                    if (!link || !name || name.length < 2) return;

                    // Clean up the link
                    const cleanLink = this.cleanCategoryLink(link);

                    // Extract slug
                    const slugMatch = cleanLink.match(/\/category\/([^/]+)\/?$/);
                    if (!slugMatch) return;

                    const slug = slugMatch[1].toLowerCase();

                    // Skip duplicates and system categories
                    if (seenSlugs.has(slug)) return;
                    if (this.isSystemCategory(slug)) return;

                    seenSlugs.add(slug);
                    categories.push({
                        name: sanitizeText(name),
                        slug: slug,
                        link: normalizeUrl(cleanLink),
                        type: 'category',
                    });
                });

                if (categories.length > 0) break;
            }

            // Fallback to default categories if none found
            if (categories.length === 0) {
                return this.getDefaultCategories();
            }

            return {
                success: true,
                data: categories,
            };
        } catch (error) {
            console.error('[CategoryExtractor] Get Categories Error:', error.message);
            return this.getDefaultCategories();
        }
    }

    /**
     * Clean category link
     */
    cleanCategoryLink(link) {
        if (!link) return '';

        if (!link.startsWith('http')) {
            link = `${this.baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
        }

        return link.replace(/\/$/, '');
    }

    /**
     * Check if category is a system/internal category
     */
    isSystemCategory(slug) {
        const systemCategories = [
            'language',
            'genre',
            'network',
            'studio',
            'post-type',
            'type',
            'country',
            'year',
            'season',
            'quality',
            'status',
            'az-list',
        ];

        // Skip language codes like en-us, zh-cn
        if (slug.match(/^[a-z]{2,3}-[a-z]{2,3}$/)) return true;

        return systemCategories.includes(slug);
    }

    /**
     * Get default categories
     */
    getDefaultCategories() {
        const defaultCategories = [
            { name: 'Cartoon', slug: 'cartoon', link: `${this.baseUrl}/category/cartoon/`, type: 'category' },
            { name: 'Anime', slug: 'anime', link: `${this.baseUrl}/category/anime/`, type: 'category' },
            { name: 'Dubbed Anime', slug: 'dubbed-anime', link: `${this.baseUrl}/category/dubbed-anime/`, type: 'category' },
            { name: 'Subbed Anime', slug: 'subbed-anime', link: `${this.baseUrl}/category/subbed-anime/`, type: 'category' },
            { name: 'Chinese Anime', slug: 'chinese-anime', link: `${this.baseUrl}/category/chinese-anime/`, type: 'category' },
            { name: 'Korean Anime', slug: 'korean-anime', link: `${this.baseUrl}/category/korean-anime/`, type: 'category' },
            { name: 'Movie', slug: 'movies', link: `${this.baseUrl}/category/post-type/movies/`, type: 'type' },
            { name: 'Series', slug: 'series', link: `${this.baseUrl}/category/post-type/series/`, type: 'type' },
        ];

        return {
            success: true,
            data: defaultCategories,
        };
    }

    /**
     * Extract all available genres
     */
    async getGenres() {
        try {
            const url = `${this.baseUrl}/category/genre/`;
            const html = await this.fetchWithRetry(url);
            const $ = require('cheerio').load(html);

            const genres = [];
            const seenSlugs = new Set();

            const genreSelectors = [
                'a[href*="/category/genre/"]',
                '.genre-list a[href*="/genre/"]',
                '.genres a[href*="/genre/"]',
                '.widget_genre a[href*="/genre/"]',
            ];

            for (const selector of genreSelectors) {
                $(selector).each((i, el) => {
                    const link = $(el).attr('href');
                    const name = $(el).text().trim();

                    if (!link || !name || name.length < 2) return;

                    const slugMatch = link.match(/\/genre\/([^/]+)/);
                    if (!slugMatch) return;

                    const slug = slugMatch[1].toLowerCase();
                    if (seenSlugs.has(slug)) return;

                    seenSlugs.add(slug);
                    genres.push({
                        name: sanitizeText(name),
                        slug: slug,
                        link: normalizeUrl(link),
                    });
                });

                if (genres.length > 0) break;
            }

            // Fallback genres if none found
            if (genres.length === 0) {
                return this.getDefaultGenres();
            }

            return {
                success: true,
                data: genres,
            };
        } catch (error) {
            console.error('[CategoryExtractor] Get Genres Error:', error.message);
            return this.getDefaultGenres();
        }
    }

    /**
     * Get default genres
     */
    getDefaultGenres() {
        const defaultGenres = [
            { name: 'Action', slug: 'action', link: `${this.baseUrl}/category/genre/action/` },
            { name: 'Adventure', slug: 'adventure', link: `${this.baseUrl}/category/genre/adventure/` },
            { name: 'Comedy', slug: 'comedy', link: `${this.baseUrl}/category/genre/comedy/` },
            { name: 'Drama', slug: 'drama', link: `${this.baseUrl}/category/genre/drama/` },
            { name: 'Fantasy', slug: 'fantasy', link: `${this.baseUrl}/category/genre/fantasy/` },
            { name: 'Horror', slug: 'horror', link: `${this.baseUrl}/category/genre/horror/` },
            { name: 'Martial Arts', slug: 'martial-arts', link: `${this.baseUrl}/category/genre/martial-arts/` },
            { name: 'Romance', slug: 'romance', link: `${this.baseUrl}/category/genre/romance/` },
            { name: 'Sci-Fi', slug: 'sci-fi', link: `${this.baseUrl}/category/genre/sci-fi/` },
            { name: 'Slice of Life', slug: 'slice-of-life', link: `${this.baseUrl}/category/genre/slice-of-life/` },
            { name: 'Supernatural', slug: 'supernatural', link: `${this.baseUrl}/category/genre/supernatural/` },
        ];

        return {
            success: true,
            data: defaultGenres,
        };
    }

    /**
     * Extract A-Z listing
     */
    async getAzList() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const availableLetters = [];

        for (const letter of letters) {
            try {
                const url = this.buildUrl('az', letter);
                const html = await fetchHTML(url);
                const $ = require('cheerio').load(html);

                const items = this.extractItems($);
                if (items.length > 0) {
                    availableLetters.push({
                        letter: letter,
                        count: items.length,
                        url: normalizeUrl(url),
                    });
                }

                await delay(this.requestDelay);
            } catch (e) {
                // Letter not available, skip
            }
        }

        return {
            success: true,
            data: availableLetters,
        };
    }

    /**
     * Extract letter listing
     */
    async extractLetter(letter, page = 1, pageSize = 20) {
        return this.extract('letter', letter.toUpperCase(), { page, pageSize });
    }

    /**
     * Extract by genre
     */
    async extractByGenre(genre, page = 1, pageSize = 20) {
        return this.extract('genre', genre.toLowerCase(), { page, pageSize });
    }

    /**
     * Extract by language
     */
    async extractByLanguage(language, page = 1, pageSize = 20) {
        return this.extract('language', language.toLowerCase(), { page, pageSize });
    }

    /**
     * Extract cartoons category
     */
    async extractCartoons(page = 1, pageSize = 20) {
        return this.extract('category', 'cartoon', { page, pageSize });
    }

    /**
     * Extract anime category
     */
    async extractAnime(page = 1, pageSize = 20) {
        return this.extract('category', 'anime', { page, pageSize });
    }

    /**
     * Extract series list
     */
    async extractSeries(page = 1, pageSize = 20) {
        return this.extract('type', 'series', { page, pageSize });
    }

    /**
     * Extract movies list
     */
    async extractMovies(page = 1, pageSize = 20) {
        return this.extract('type', 'movies', { page, pageSize });
    }

    /**
     * Recursively fetch all items from a category with pagination
     */
    async fetchAllFromCategory(type, value, pageSize = 20, maxPages = 100) {
        const allItems = [];
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage && currentPage <= maxPages) {
            const result = await this.extract(type, value, { page: currentPage, pageSize });

            if (!result.success) {
                break;
            }

            const { data } = result;
            allItems.push(...data.items);

            hasNextPage = data.hasNextPage && allItems.length < 10000;
            currentPage++;

            // Add delay between requests
            if (hasNextPage) {
                await delay(this.requestDelay);
            }
        }

        return {
            success: true,
            data: {
                type: type,
                value: value,
                totalItems: allItems.length,
                items: allItems,
            },
        };
    }
}

module.exports = CategoryExtractor;
