/**
 * Search Extractor for Anime Salt API
 * Handles search functionality with suggestions and filtering
 */

const { fetchHTML, parseAnimeItem, normalizeUrl, sanitizeText, paginate } = require('../utils/helpers');

class SearchExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Search for anime by keyword
     */
    async search(keyword, options = {}) {
        try {
            if (!keyword || keyword.trim().length === 0) {
                return {
                    success: false,
                    error: 'Search keyword is required',
                };
            }

            const url = this.buildSearchUrl(keyword, options);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const results = this.parseResults($);
            
            // Apply pagination if needed
            const page = options.page || 1;
            const pageSize = options.pageSize || 20;
            const paginated = paginate(results, page, pageSize);

            return {
                success: true,
                data: {
                    keyword: keyword,
                    totalResults: results.length,
                    ...paginated,
                },
            };
        } catch (error) {
            console.error('[SearchExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get search suggestions (autocomplete)
     */
    async getSuggestions(keyword, limit = 10) {
        try {
            if (!keyword || keyword.trim().length < 2) {
                return {
                    success: true,
                    data: [],
                };
            }

            const url = this.buildSearchUrl(keyword);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const suggestions = [];
            
            // Try different selectors for suggestions
            const suggestionSelectors = [
                '.search-results .post',
                '.suggestions .item',
                '.autocomplete li',
                '.search-suggestions a',
            ];

            for (const selector of suggestionSelectors) {
                $(selector).each((i, el) => {
                    if (i >= limit) return;
                    
                    const link = $(el).find('a').attr('href') || $(el).attr('href');
                    const title = $(el).find('.entry-title, .title').text().trim() || 
                                  $(el).text().trim();
                    const poster = this.extractPoster($(el));
                    
                    if (title && link && title.toLowerCase().includes(keyword.toLowerCase())) {
                        suggestions.push({
                            id: this.extractId(link),
                            title: sanitizeText(title),
                            poster: poster,
                            link: normalizeUrl(link),
                            releaseDate: $(el).find('.year, .date').text().trim() || '',
                            showType: $(el).find('.type').text().trim() || 'TV',
                            duration: $(el).find('.duration').text().trim() || '24 min',
                        });
                    }
                });

                if (suggestions.length > 0) break;
            }

            return {
                success: true,
                data: suggestions,
            };
        } catch (error) {
            console.error('[SearchExtractor] Suggestions Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get top search terms (popular anime titles from homepage)
     */
    async getTopSearch(limit = 10) {
        try {
            // Fetch homepage to get popular/trending anime titles
            const html = await fetchHTML(this.baseUrl);
            const $ = require('cheerio').load(html);

            const topSearch = [];
            
            // Collect titles from trending/top sections
            const seenTitles = new Set();
            
            // Get from trending chart
            $('.trending .post, .chart-item .post, .top-10 .post').each((i, el) => {
                if (i >= limit && topSearch.length >= limit) return;
                
                const $el = $(el);
                const title = $el.find('.entry-title').text().trim() || 
                              $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                              $el.find('.title').text().trim();
                const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
                
                if (title && link && !seenTitles.has(title.toLowerCase())) {
                    seenTitles.add(title.toLowerCase());
                    topSearch.push({
                        title: sanitizeText(title),
                        link: normalizeUrl(link),
                    });
                }
            });
            
            // If no results from trending, get from spotlight/featured
            if (topSearch.length < limit) {
                $('.spotlight-item, .featured-item, .swiper-slide .post').each((i, el) => {
                    if (topSearch.length >= limit) return;
                    
                    const $el = $(el);
                    const title = $el.find('.entry-title').text().trim() || 
                                  $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                                  $el.find('.title').text().trim();
                    const link = $el.find('a.lnk-blk').attr('href') || $el.find('a').first().attr('href');
                    
                    if (title && link && !seenTitles.has(title.toLowerCase())) {
                        seenTitles.add(title.toLowerCase());
                        topSearch.push({
                            title: sanitizeText(title),
                            link: normalizeUrl(link),
                        });
                    }
                });
            }
            
            // If still no results, get from any post links
            if (topSearch.length < limit) {
                $('.post a.lnk-blk').each((i, el) => {
                    if (topSearch.length >= limit) return;
                    
                    const $el = $(el);
                    const link = $el.attr('href');
                    const title = $el.find('.entry-title').text().trim() || 
                                  $el.find('img').attr('alt')?.replace(/^Image /, '') ||
                                  $el.attr('title') || '';
                    
                    // Try to get title from parent or image alt
                    const $parent = $el.closest('.post');
                    const parentTitle = $parent.find('.entry-title').text().trim() || 
                                       $parent.find('img').attr('alt')?.replace(/^Image /, '');
                    
                    const finalTitle = parentTitle || title;
                    
                    if (finalTitle && link && link.includes('/series/') || link.includes('/movies/')) {
                        const cleanTitle = finalTitle.trim();
                        if (cleanTitle && !seenTitles.has(cleanTitle.toLowerCase())) {
                            seenTitles.add(cleanTitle.toLowerCase());
                            topSearch.push({
                                title: sanitizeText(cleanTitle),
                                link: normalizeUrl(link),
                            });
                        }
                    }
                });
            }

            return {
                success: true,
                data: topSearch.slice(0, limit),
            };
        } catch (error) {
            console.error('[SearchExtractor] Top Search Error:', error.message);
            return {
                success: false,
                error: error.message,
                data: [],
            };
        }
    }

    /**
     * Build search URL
     */
    buildSearchUrl(keyword, options = {}) {
        const encodedKeyword = encodeURIComponent(keyword);
        const page = options.page || 1;
        
        return `${this.baseUrl}/?s=${encodedKeyword}&page=${page}`;
    }

    /**
     * Parse search results
     */
    parseResults($) {
        const results = [];
        
        // Try different result selectors
        const resultSelectors = [
            '.search-results .post',
            '.posts .post',
            '.result-item',
            '.movies .tt',
            '.film-item',
            'article.post',
        ];

        for (const selector of resultSelectors) {
            const found = this.parseBySelector($, selector);
            if (found.length > 0) {
                return found;
            }
        }

        return results;
    }

    /**
     * Parse results by selector
     */
    parseBySelector($, selector) {
        const results = [];
        
        $(selector).each((i, el) => {
            const anime = parseAnimeItem($(el));
            
            // Only add if has valid ID and title
            if (anime.id && anime.title && anime.title !== 'Unknown') {
                // Extract additional info
                const tvInfo = {
                    showType: anime.type || 'TV',
                    duration: '24 min',
                };

                results.push({
                    id: anime.id,
                    data_id: this.generateDataId(anime.id),
                    title: anime.title,
                    japanese_title: anime.japanese_title || '',
                    poster: anime.poster,
                    link: anime.link,
                    tvInfo: tvInfo,
                });
            }
        });

        return results;
    }

    /**
     * Extract poster from element
     */
    extractPoster(element) {
        const img = element.find('img');
        if (img.length === 0) return null;
        
        const dataSrc = img.attr('data-src') || img.attr('src');
        if (dataSrc) {
            if (dataSrc.startsWith('//')) {
                return 'https:' + dataSrc;
            }
            return dataSrc;
        }
        
        return null;
    }

    /**
     * Extract ID from URL
     */
    extractId(url) {
        if (!url) return null;
        
        const match = url.match(/\/(series|movies)\/([^\/]+)\/?$/);
        if (match) {
            return match[2];
        }
        
        return url.split('/').filter(Boolean).pop();
    }

    /**
     * Generate numeric data ID
     */
    generateDataId(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Advanced search with filters
     */
    async advancedSearch(filters = {}) {
        try {
            const url = this.buildAdvancedUrl(filters);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const results = this.parseResults($);
            
            // Apply additional filtering
            let filtered = results;
            
            if (filters.type) {
                filtered = filtered.filter(r => 
                    r.tvInfo?.showType?.toLowerCase() === filters.type.toLowerCase()
                );
            }
            
            if (filters.year) {
                // Would need year info in parseAnimeItem
            }

            return {
                success: true,
                data: {
                    filters: filters,
                    totalResults: filtered.length,
                    results: filtered,
                },
            };
        } catch (error) {
            console.error('[SearchExtractor] Advanced Search Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build advanced search URL
     */
    buildAdvancedUrl(filters) {
        const params = new URLSearchParams();
        
        if (filters.keyword) {
            params.set('s', filters.keyword);
        }
        
        if (filters.genre) {
            params.set('genre', filters.genre);
        }
        
        if (filters.year) {
            params.set('year', filters.year);
        }
        
        if (filters.type) {
            params.set('type', filters.type);
        }
        
        params.set('page', filters.page || 1);
        
        return `${this.baseUrl}/?${params.toString()}`;
    }
}

module.exports = SearchExtractor;
