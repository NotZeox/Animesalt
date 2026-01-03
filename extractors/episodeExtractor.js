/**
 * Episode Extractor for Anime Salt API v2
 * Extracts complete episode lists with full pagination support
 * Matches format from itzzzme/anime-api reference
 */

const { fetchHTML, extractIdFromUrl, extractEpisodeFromUrl, sanitizeText, normalizeUrl } = require('../utils/helpers');

class EpisodeExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.maxPages = 100; // Safety limit for pagination
        this.concurrentRequests = 3; // Limit concurrent requests to avoid rate limiting
    }

    /**
     * Extract all episodes for an anime (recursive pagination)
     * This fixes the issue where only page 1 episodes were returned
     */
    async extract(id, options = {}) {
        try {
            const url = this.buildUrl(id);
            console.log(`[EpisodeExtractor] Fetching: ${url}`);

            // Fetch first page to check pagination
            const firstPageHtml = await fetchHTML(url);
            const $ = require('cheerio').load(firstPageHtml);

            // Get all episode links from first page
            let allEpisodes = this.parseEpisodes($);

            // Check for pagination and fetch remaining pages
            const totalPages = this.detectTotalPages($);

            if (totalPages > 1) {
                console.log(`[EpisodeExtractor] Detected ${totalPages} pages, fetching remaining pages...`);
                
                // Fetch remaining pages concurrently with limit
                const pagePromises = [];
                for (let page = 2; page <= Math.min(totalPages, this.maxPages); page++) {
                    pagePromises.push(this.fetchEpisodePage(id, page));
                    
                    // Limit concurrent requests
                    if (pagePromises.length >= this.concurrentRequests) {
                        const pageResults = await Promise.all(pagePromises);
                        pageResults.forEach(episodes => {
                            allEpisodes = [...allEpisodes, ...episodes];
                        });
                        pagePromises.length = 0;
                    }
                }

                // Wait for remaining promises
                if (pagePromises.length > 0) {
                    const pageResults = await Promise.all(pagePromises);
                    pageResults.forEach(episodes => {
                        allEpisodes = [...allEpisodes, ...episodes];
                    });
                }
            }

            // Remove duplicates and sort
            allEpisodes = this.deduplicateAndSort(allEpisodes);

            console.log(`[EpisodeExtractor] Total episodes found: ${allEpisodes.length}`);

            return {
                success: true,
                data: {
                    totalEpisodes: allEpisodes.length,
                    episodes: allEpisodes,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build URL from anime ID
     */
    buildUrl(id, page = 1) {
        let cleanId = id;
        if (id.startsWith('series/')) {
            cleanId = id.replace('series/', '');
        }
        
        // Add page parameter if page > 1
        const pageParam = page > 1 ? `?page=${page}` : '';
        return `${this.baseUrl}/series/${cleanId}/${pageParam}`;
    }

    /**
     * Detect total pages from pagination element
     */
    detectTotalPages($) {
        // Try multiple methods to detect total pages

        // Method 1: Look for "Last" page link with page number
        const lastPageLink = $('a[href*="page="], .pagination a').filter(function() {
            const href = $(this).attr('href') || '';
            const text = $(this).text().trim();
            return text === 'Last' || text.includes('Last') || href.includes('page=');
        }).last();

        if (lastPageLink.length > 0) {
            const href = lastPageLink.attr('href') || '';
            const match = href.match(/page=(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }

        // Method 2: Look for page numbers in pagination
        const pageNumbers = [];
        $('.pagination a, .pages a, [class*="page"]').each(function() {
            const text = $(this).text().trim();
            const num = parseInt(text, 10);
            if (!isNaN(num) && num > 0) {
                pageNumbers.push(num);
            }
        });

        if (pageNumbers.length > 0) {
            return Math.max(...pageNumbers);
        }

        // Method 3: Look for "Page X of Y" text
        const pageText = $('.pagination, .pages, .page-nav').text();
        const pageMatch = pageText.match(/of\s+(\d+)/i);
        if (pageMatch) {
            return parseInt(pageMatch[1], 10);
        }

        // Method 4: Count episode items and estimate
        const episodeCount = $('a[href*="/episode/"]').length;
        if (episodeCount > 50) {
            return Math.ceil(episodeCount / 50);
        }

        return 1; // Default to 1 page
    }

    /**
     * Fetch a single episode page
     */
    async fetchEpisodePage(id, page) {
        try {
            const url = this.buildUrl(id, page);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);
            const episodes = this.parseEpisodes($);
            console.log(`[EpisodeExtractor] Page ${page}: Found ${episodes.length} episodes`);
            return episodes;
        } catch (error) {
            console.error(`[EpisodeExtractor] Error fetching page ${page}:`, error.message);
            return [];
        }
    }

    /**
     * Parse episodes from page HTML
     */
    parseEpisodes($) {
        const episodes = [];

        // Try different selectors for episode links
        const selectors = [
            'article.post a[href*="/episode/"]',
            '.episodes-list a[href*="/episode/"]',
            '.episode-list a[href*="/episode/"]',
            '#episode_list a[href*="/episode/"]',
            '.posts a[href*="/episode/"]',
            'a[href*="/episode/"]',
        ];

        for (const selector of selectors) {
            const found = this.parseBySelector($, selector);
            if (found.length > 0) {
                return found;
            }
        }

        return episodes;
    }

    /**
     * Parse episodes using specific selector
     */
    parseBySelector($, selector) {
        const foundEpisodes = [];

        $(selector).each((i, el) => {
            const link = $(el).attr('href');
            
            if (!link || !link.includes('/episode/')) return;

            // Extract episode number from URL
            const epData = extractEpisodeFromUrl(link);
            
            if (epData) {
                const title = $(el).find('.entry-title').text().trim() || 
                              $(el).attr('title') || 
                              $(el).text().trim();

                // Clean up title - remove episode number if it's in the title
                const cleanTitle = title.replace(/^Episode\s*\d+[:\s]*/i, '').trim();

                // Get Japanese title from nearby elements
                const japaneseTitle = $(el).find('.jp-title, .japanese-title, [lang="ja"]').text().trim() || '';

                foundEpisodes.push({
                    episode_no: epData.episode,
                    id: epData.formatted,
                    data_id: this.generateDataId(link),
                    jname: sanitizeText(cleanTitle),
                    title: sanitizeText(cleanTitle),
                    japanese_title: sanitizeText(japaneseTitle),
                    link: normalizeUrl(link),
                });
            }
        });

        // Remove duplicates and sort
        return this.deduplicateAndSort(foundEpisodes);
    }

    /**
     * Deduplicate and sort episodes
     */
    deduplicateAndSort(episodes) {
        const unique = episodes.filter((ep, index, self) =>
            index === self.findIndex(e => e.id === ep.id)
        );

        return unique.sort((a, b) => a.episode_no - b.episode_no);
    }

    /**
     * Generate numeric data ID from string
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
     * Extract episodes with pagination support (for API with page params)
     */
    async extractWithPagination(id, page = 1, pageSize = 50) {
        try {
            // Fetch ALL episodes first
            const allResult = await this.extract(id);
            
            if (!allResult.success) {
                return allResult;
            }

            const allEpisodes = allResult.data.episodes;
            
            // Paginate results
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const paginatedEpisodes = allEpisodes.slice(start, end);

            return {
                success: true,
                data: {
                    totalEpisodes: allEpisodes.length,
                    currentPage: page,
                    totalPages: Math.ceil(allEpisodes.length / pageSize),
                    episodes: paginatedEpisodes,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Pagination Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get episode range
     */
    async extractRange(id, startEp, endEp) {
        try {
            const result = await this.extract(id);
            
            if (!result.success) {
                return result;
            }

            const filteredEpisodes = result.data.episodes.filter(ep => 
                ep.episode_no >= startEp && ep.episode_no <= endEp
            );

            return {
                success: true,
                data: {
                    totalEpisodes: filteredEpisodes.length,
                    episodes: filteredEpisodes,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Range Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Extract single episode info
     */
    async extractSingle(episodeUrl) {
        try {
            const html = await fetchHTML(episodeUrl);
            const $ = require('cheerio').load(html);

            // Extract episode details
            const title = $('h1.entry-title, .episode-title').text().trim();
            const epData = extractEpisodeFromUrl(episodeUrl);

            // Extract synopsis/preview
            const synopsis = $('.episode-synopsis, .epi-desc').text().trim();

            return {
                success: true,
                data: {
                    episode_no: epData?.episode || 0,
                    id: epData?.formatted || '',
                    title: sanitizeText(title),
                    synopsis: sanitizeText(synopsis),
                    link: episodeUrl,
                },
            };
        } catch (error) {
            console.error('[EpisodeExtractor] Single Episode Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = EpisodeExtractor;
