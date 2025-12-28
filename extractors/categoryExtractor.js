/**
 * Category Extractor for Anime Salt API
 * Handles category, letter, and listing pages
 */

const { fetchHTML, getImageUrl, normalizeUrl, extractIdFromUrl, sanitizeText } = require('../utils/helpers');

class CategoryExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract category/letter page data with pagination
     * @param {string} type - Type of page: 'category', 'letter', 'post-type'
     * @param {string} value - Category name, letter, or post-type value
     * @param {object} options - Options including page number
     */
    async extract(type, value, options = {}) {
        try {
            const url = this.buildUrl(type, value, options.page || 1);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const data = {
                type: type,
                value: value,
                page: options.page || 1,
                pageSize: options.pageSize || 20,
                items: this.extractItems($),
                pagination: this.extractPagination($),
            };

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[CategoryExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build URL based on type and value
     */
    buildUrl(type, value, page = 1) {
        let path = '';

        switch (type) {
            case 'category':
                // /category/{value}/
                path = `/category/${value}/`;
                break;
            case 'letter':
                // /letter/{value}/
                path = `/letter/${value.toUpperCase()}/`;
                break;
            case 'post-type':
                // /category/post-type/{value}/
                path = `/category/post-type/${value}/`;
                break;
            case 'genre':
                // /category/genre/{value}/
                path = `/category/genre/${value}/`;
                break;
            case 'language':
                // /category/language/{value}/
                path = `/category/language/${value}/`;
                break;
            case 'network':
                // /category/network/{value}/
                path = `/category/network/${value}/`;
                break;
            case 'studio':
                // /category/studio/{value}/
                path = `/category/studio/${value}/`;
                break;
            default:
                path = `/${type}/${value}/`;
        }

        // Add pagination parameter
        if (page > 1) {
            path += `?page=${page}`;
        }

        return `${this.baseUrl}${path}`;
    }

    /**
     * Extract all anime/movie items from the page
     */
    extractItems($) {
        const items = [];

        // Try multiple selectors for different page layouts
        const itemSelectors = [
            '.posts .post',
            '.movies .tt',
            '.film-list .film-item',
            '.post-article',
            '.archive-item',
            '.browse-movie-item',
            '.media-item',
            '.video-item',
        ];

        // Find the best matching container
        let container = null;
        for (const selector of itemSelectors) {
            const $container = $(selector);
            if ($container.length > 0) {
                container = $container;
                break;
            }
        }

        // If no container found, try to find links and work backwards
        if (!container || container.length === 0) {
            // Try to find all anime/movie links and build items from them
            $('a[href*="/series/"], a[href*="/movies/"]').each((i, el) => {
                if (i < 50) { // Limit to first 50 to avoid duplicates
                    const $el = $(el);
                    const href = $el.attr('href');
                    const $parent = $el.closest('.post, .item, .movie, .video, article');
                    const item = this.parseItem($, $parent.length > 0 ? $parent : $el, href);
                    if (item.id && !items.find(existing => existing.id === item.id)) {
                        items.push(item);
                    }
                }
            });
        } else {
            container.each((i, el) => {
                const item = this.parseItem($, $(el));
                if (item.id && item.title && !items.find(existing => existing.id === item.id)) {
                    items.push(item);
                }
            });
        }

        return items;
    }

    /**
     * Parse individual item from element
     */
    parseItem($, $el, link = null) {
        // Get link from element or its children
        if (!link) {
            link = $el.find('a[href*="/series/"], a[href*="/movies/"]').attr('href') || 
                   $el.attr('href');
        }

        // Extract ID and type from link
        let id = '';
        let type = 'series';
        let linkUrl = link || '';

        if (linkUrl) {
            if (linkUrl.includes('/movies/')) {
                type = 'movie';
                id = linkUrl.split('/movies/')[1]?.replace(/\/$/, '') || '';
            } else if (linkUrl.includes('/series/')) {
                type = 'series';
                id = linkUrl.split('/series/')[1]?.replace(/\/$/, '') || '';
            } else if (linkUrl.includes('/episode/')) {
                // Skip episode links
                return { id: '', title: '', poster: null };
            }
        }

        // Get title
        let title = $el.find('.entry-title, .title, .movie-title, .video-title, h3, h4').text().trim();
        if (!title) {
            title = $el.find('img').attr('alt') || '';
        }
        if (!title) {
            title = $el.clone().children().remove().end().text().trim();
        }

        // Get poster
        const poster = getImageUrl($el.find('img').first());

        // Get additional info
        let year = '';
        let quality = 'HD';
        let dubStatus = '';

        // Try to find year
        const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            year = yearMatch[0];
        }

        // Try to find quality
        if ($el.text().toLowerCase().includes('1080p')) {
            quality = 'Full HD';
        } else if ($el.text().toLowerCase().includes('720p')) {
            quality = 'HD';
        }

        // Try to find dub/sub status
        if ($el.text().toLowerCase().includes('dub') || $el.find('.dub').length > 0) {
            dubStatus = 'Dub';
        } else if ($el.text().toLowerCase().includes('sub') || $el.find('.sub').length > 0) {
            dubStatus = 'Sub';
        }

        return {
            id: id,
            title: sanitizeText(title) || 'Unknown',
            poster: poster,
            type: type,
            link: normalizeUrl(linkUrl),
            year: year,
            quality: quality,
            dubStatus: dubStatus,
            data_id: this.generateDataId(id),
        };
    }

    /**
     * Extract pagination info
     */
    extractPagination($) {
        const pagination = {
            hasNext: false,
            hasPrev: false,
            currentPage: 1,
            totalPages: 1,
        };

        // Check for next page link
        const nextLink = $('a.next, a.page-numbers.next, a[rel="next"], .pagination .next a');
        pagination.hasNext = nextLink.length > 0;

        // Check for previous page link
        const prevLink = $('a.prev, a.page-numbers.prev, a[rel="prev"], .pagination .prev a');
        pagination.hasPrev = prevLink.length > 0;

        // Try to find current page
        const currentPageLink = $('span.current, .pagination .active, .page-numbers.current');
        if (currentPageLink.length > 0) {
            const pageText = currentPageLink.text().trim();
            pagination.currentPage = parseInt(pageText) || 1;
        }

        // Try to find total pages
        const lastPageLink = $('a.last, .pagination .last a, .page-numbers:last');
        if (lastPageLink.length > 0) {
            const href = lastPageLink.attr('href') || '';
            const match = href.match(/page[=\/](\d+)/);
            if (match) {
                pagination.totalPages = parseInt(match[1]);
            } else {
                const text = lastPageLink.text().trim();
                const numMatch = text.match(/\d+/);
                if (numMatch) {
                    pagination.totalPages = parseInt(numMatch[0]);
                }
            }
        }

        // Try to count page links to estimate total
        const pageLinks = $('a.page-numbers, .pagination a:not(.next):not(.prev)');
        if (pageLinks.length > 0 && pagination.totalPages === 1) {
            pagination.totalPages = Math.max(1, pageLinks.length);
        }

        return pagination;
    }

    /**
     * Generate numeric data ID
     */
    generateDataId(str) {
        if (!str) return 0;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    // ============ Specific Category Type Methods ============

    /**
     * Extract cartoon category
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
        return this.extract('post-type', 'series', { page, pageSize });
    }

    /**
     * Extract movies list
     */
    async extractMovies(page = 1, pageSize = 20) {
        return this.extract('post-type', 'movies', { page, pageSize });
    }

    /**
     * Extract letter listing (A, B, C, etc.)
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
     * Extract by network/studio
     */
    async extractByNetwork(network, page = 1, pageSize = 20) {
        return this.extract('network', network.toLowerCase(), { page, pageSize });
    }

    /**
     * Get all available categories
     */
    async getCategories() {
        try {
            const url = `${this.baseUrl}/category/`;
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const categories = [];
            const seenSlugs = new Set();

            // Try multiple selectors for category links
            const selectors = [
                'a[href*="/category/"]:not([href*="/category/language/"]):not([href*="/category/genre/"]):not([href*="/category/network/"]):not([href*="/category/studio/"]):not([href*="/category/post-type/"])',
                '.category-list a[href*="/category/"]',
                '.widget_categories a[href*="/category/"]',
                'nav a[href*="/category/"]',
                '.menu a[href*="/category/"]',
            ];

            for (const selector of selectors) {
                $(selector).each((i, el) => {
                    const link = $(el).attr('href');
                    let name = $(el).text().trim();
                    
                    // Skip if no link or name
                    if (!link || !name) return;
                    
                    // Clean up the link
                    if (!link.startsWith('http')) {
                        link = `${this.baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
                    }

                    // Extract slug from link
                    const slugMatch = link.match(/\/category\/([^/]+)\/?$/);
                    if (!slugMatch) return;
                    
                    const slug = slugMatch[1];
                    
                    // Skip if we've already seen this slug or if it's a filtered type
                    if (seenSlugs.has(slug)) return;
                    if (['language', 'genre', 'network', 'studio', 'post-type'].includes(slug)) return;
                    if (slug.match(/^[a-z]{2,3}-[a-z]{2,3}$/)) return; // Skip language codes like en-us

                    seenSlugs.add(slug);
                    categories.push({
                        name: sanitizeText(name),
                        slug: slug,
                        link: normalizeUrl(link),
                    });
                });

                // If we found categories, break
                if (categories.length > 0) break;
            }

            // If still no categories found, try to extract from the homepage
            if (categories.length === 0) {
                const homeUrl = this.baseUrl;
                const homeHtml = await fetchHTML(homeUrl);
                const $home = require('cheerio').load(homeHtml);

                $home('a[href*="/category/"]').each((i, el) => {
                    const link = $(el).attr('href');
                    let name = $(el).text().trim();
                    
                    if (!link || !name) return;
                    if (!link.startsWith('http')) {
                        link = `${this.baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
                    }

                    const slugMatch = link.match(/\/category\/([^/]+)\/?$/);
                    if (!slugMatch) return;
                    
                    const slug = slugMatch[1];
                    
                    if (seenSlugs.has(slug)) return;
                    if (['language', 'genre', 'network', 'studio', 'post-type'].includes(slug)) return;
                    if (slug.match(/^[a-z]{2,3}-[a-z]{2,3}$/)) return;

                    seenSlugs.add(slug);
                    categories.push({
                        name: sanitizeText(name),
                        slug: slug,
                        link: normalizeUrl(link),
                    });
                });
            }

            // If still no categories found, return default categories
            if (categories.length === 0) {
                const defaultCategories = [
                    { name: 'Cartoon', slug: 'cartoon', link: `${this.baseUrl}/category/cartoon/` },
                    { name: 'Anime', slug: 'anime', link: `${this.baseUrl}/category/anime/` },
                    { name: 'Dubbed Anime', slug: 'dubbed-anime', link: `${this.baseUrl}/category/dubbed-anime/` },
                    { name: 'Subbed Anime', slug: 'subbed-anime', link: `${this.baseUrl}/category/subbed-anime/` },
                    { name: 'Chinese Anime', slug: 'chinese-anime', link: `${this.baseUrl}/category/chinese-anime/` },
                    { name: 'Korean Anime', slug: 'korean-anime', link: `${this.baseUrl}/category/korean-anime/` },
                ];
                return {
                    success: true,
                    data: defaultCategories,
                };
            }

            return {
                success: true,
                data: categories,
            };
        } catch (error) {
            console.error('[CategoryExtractor] Get Categories Error:', error.message);
            // Return default categories on error
            const defaultCategories = [
                { name: 'Cartoon', slug: 'cartoon', link: `${this.baseUrl}/category/cartoon/` },
                { name: 'Anime', slug: 'anime', link: `${this.baseUrl}/category/anime/` },
                { name: 'Dubbed Anime', slug: 'dubbed-anime', link: `${this.baseUrl}/category/dubbed-anime/` },
            ];
            return {
                success: true,
                data: defaultCategories,
            };
        }
    }

    /**
     * Get all available letters
     */
    async getLetters() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const availableLetters = [];

        for (const letter of letters) {
            try {
                const url = `${this.baseUrl}/letter/${letter}/`;
                const html = await fetchHTML(url);
                const $ = require('cheerio').load(html);

                const items = this.extractItems($);
                if (items.length > 0) {
                    availableLetters.push(letter);
                }
            } catch (e) {
                // Letter not available
            }
        }

        return {
            success: true,
            data: availableLetters,
        };
    }
}

module.exports = CategoryExtractor;
