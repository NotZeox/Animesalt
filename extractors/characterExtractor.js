/**
 * Character Extractor for Anime Salt API v2
 * Extracts character lists and voice actor details
 * Matches format from itzzzme/anime-api reference
 */

const { fetchHTML, extractIdFromUrl, normalizeUrl, sanitizeText, getImageUrl } = require('../utils/helpers');

class CharacterExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract character list for an anime
     */
    async extractCharacterList(id, page = 1) {
        try {
            const url = this.buildUrl(id);
            console.log(`[CharacterExtractor] Fetching character list: ${url}`);

            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const characters = this.parseCharacters($);
            const totalPages = this.detectPagination($);

            return {
                success: true,
                data: {
                    currentPage: page,
                    totalPages: totalPages,
                    data: characters,
                },
            };
        } catch (error) {
            console.error('[CharacterExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Build URL from anime ID
     */
    buildUrl(id) {
        let cleanId = id;
        if (id.startsWith('series/')) {
            cleanId = id.replace('series/', '');
        }
        return `${this.baseUrl}/series/${cleanId}/`;
    }

    /**
     * Parse characters and voice actors from page
     */
    parseCharacters($) {
        const characters = [];

        // Try different selectors for character sections
        const selectors = [
            '.character-list .character-item',
            '.characters .character',
            '[class*="character"] .post',
            '.cast-list .cast-item',
            '.voice-actors .va-item',
        ];

        let foundCharacters = [];

        for (const selector of selectors) {
            foundCharacters = this.parseBySelector($, selector);
            if (foundCharacters.length > 0) {
                return foundCharacters;
            }
        }

        // If no structured selector found, try to parse from table or list
        if (foundCharacters.length === 0) {
            foundCharacters = this.parseFromContent($);
        }

        return foundCharacters;
    }

    /**
     * Parse characters using specific selector
     */
    parseBySelector($, selector) {
        const characters = [];

        $(selector).each((i, el) => {
            const $el = $(el);
            
            // Extract character info
            const name = $el.find('.name, .character-name, [class*="name"]').text().trim();
            const image = getImageUrl($el.find('img'));
            const role = $el.find('.role, .character-role').text().trim() || 'Main';
            
            // Extract voice actors
            const voiceActors = [];
            $el.find('.voice-actor, .va-item, [class*="voice-actor"]').each((j, vaEl) => {
                const vaName = $(vaEl).find('.name, [class*="name"]').text().trim();
                const vaImage = getImageUrl($(vaEl).find('img'));
                const vaLanguage = $(vaEl).find('.language, [class*="language"]').text().trim() || 'Japanese';
                
                if (vaName) {
                    voiceActors.push({
                        id: extractIdFromUrl($(vaEl).find('a').attr('href') || ''),
                        name: sanitizeText(vaName),
                        poster: vaImage,
                        language: sanitizeText(vaLanguage),
                    });
                }
            });

            if (name) {
                characters.push({
                    character: {
                        id: extractIdFromUrl($el.find('a[href*="/character/"]').attr('href') || ''),
                        poster: image,
                        name: sanitizeText(name),
                        cast: sanitizeText(role),
                    },
                    voiceActors: voiceActors,
                });
            }
        });

        return characters;
    }

    /**
     * Parse characters from content structure
     */
    parseFromContent($) {
        const characters = [];

        // Look for character section in page
        const charSection = $('h2:contains("Characters"), h3:contains("Characters"), .section:contains("Character")').closest('section, div');

        if (charSection.length > 0) {
            charSection.find('.post, article, .item').each((i, el) => {
                const $el = $(el);
                const name = $el.find('.entry-title, .title').text().trim();
                const image = getImageUrl($el.find('img'));
                
                // Look for voice actor name in nearby elements
                const vaName = $el.next().find('.va-name, [class*="voice"]').text().trim() ||
                              $el.parent().find('[class*="voice"]').text().trim();

                if (name) {
                    const characterObj = {
                        character: {
                            id: extractIdFromUrl($el.find('a').attr('href') || ''),
                            poster: image,
                            name: sanitizeText(name),
                            cast: 'Main',
                        },
                        voiceActors: [],
                    };

                    if (vaName) {
                        characterObj.voiceActors.push({
                            id: '',
                            name: sanitizeText(vaName),
                            poster: '',
                            language: 'Japanese',
                        });
                    }

                    characters.push(characterObj);
                }
            });
        }

        return characters;
    }

    /**
     * Detect pagination in character list
     */
    detectPagination($) {
        const pageText = $('.pagination, .pages, .page-nav').text();
        const pageMatch = pageText.match(/of\s+(\d+)/i);
        if (pageMatch) {
            return parseInt(pageMatch[1], 10);
        }

        const pageNumbers = [];
        $('.pagination a, .pages a').each(function() {
            const text = $(this).text().trim();
            const num = parseInt(text, 10);
            if (!isNaN(num) && num > 0) {
                pageNumbers.push(num);
            }
        });

        if (pageNumbers.length > 0) {
            return Math.max(...pageNumbers);
        }

        return 1;
    }

    /**
     * Extract single character details
     */
    async extractCharacter(id) {
        try {
            const url = `${this.baseUrl}/character/${id}/`;
            console.log(`[CharacterExtractor] Fetching character: ${url}`);

            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const character = this.parseCharacterDetail($);

            return {
                success: true,
                data: [character],
            };
        } catch (error) {
            console.error('[CharacterExtractor] Detail Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Parse character detail page
     */
    parseCharacterDetail($) {
        const name = $('h1.entry-title, .character-name').text().trim();
        const image = getImageUrl($('.character-image img, .profile img').first());
        const description = $('.character-about, .about, .description').text().trim();

        // Parse about section
        const aboutHtml = $('.character-about, .about').html() || '';
        
        // Extract voice actors
        const voiceActors = [];
        $('.voice-actor, [class*="voice-actor"]').each((i, el) => {
            const vaName = $(el).find('.name').text().trim();
            const vaImage = getImageUrl($(el).find('img'));
            const vaLanguage = $(el).find('.language').text().trim() || 'Japanese';
            
            if (vaName) {
                voiceActors.push({
                    name: sanitizeText(vaName),
                    profile: vaImage,
                    language: sanitizeText(vaLanguage),
                    id: extractIdFromUrl($(el).find('a').attr('href') || ''),
                });
            }
        });

        // Extract animeography
        const animeography = [];
        $('.animeography, [class*="animeography"] .item').each((i, el) => {
            const title = $(el).find('.title, .name').text().trim();
            const poster = getImageUrl($(el).find('img'));
            const role = $(el).find('.role').text().trim();
            const type = $(el).find('.type').text().trim();

            if (title) {
                animeography.push({
                    title: sanitizeText(title),
                    poster: poster,
                    role: sanitizeText(role),
                    type: sanitizeText(type),
                    id: extractIdFromUrl($(el).find('a').attr('href') || ''),
                });
            }
        });

        return {
            id: id || '',
            name: sanitizeText(name),
            profile: image,
            japaneseName: $('[lang="ja"]').text().trim() || '',
            about: {
                description: sanitizeText(description),
                style: aboutHtml,
            },
            voiceActors: voiceActors,
            animeography: animeography,
        };
    }

    /**
     * Extract voice actor details
     */
    async extractVoiceActor(id) {
        try {
            const url = `${this.baseUrl}/voice-actor/${id}/`;
            console.log(`[CharacterExtractor] Fetching voice actor: ${url}`);

            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const va = this.parseVoiceActorDetail($);

            return {
                success: true,
                data: [va],
            };
        } catch (error) {
            console.error('[CharacterExtractor] Voice Actor Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Parse voice actor detail page
     */
    parseVoiceActorDetail($) {
        const name = $('h1.entry-title, .va-name').text().trim();
        const image = getImageUrl($('.va-image img, .profile img').first());
        const japaneseName = $('[lang="ja"]').text().trim();
        const description = $('.va-about, .about, .description').text().trim();

        // Extract roles
        const roles = [];
        $('.va-roles, [class*="roles"] .item').each((i, el) => {
            const animeTitle = $(el).find('.anime-title, .title').text().trim();
            const animePoster = getImageUrl($(el).find('img'));
            const characterName = $(el).find('.character-name').text().trim();
            const role = $(el).find('.role-type').text().trim();
            const animeType = $(el).find('.type').text().trim();

            if (animeTitle) {
                const animeId = extractIdFromUrl($(el).find('a[href*="/series/"]').attr('href') || '');
                const characterId = extractIdFromUrl($(el).find('a[href*="/character/"]').attr('href') || '');

                roles.push({
                    anime: {
                        title: sanitizeText(animeTitle),
                        poster: animePoster,
                        type: sanitizeText(animeType),
                        year: $(el).find('.year').text().trim() || '',
                        id: animeId,
                    },
                    character: {
                        name: sanitizeText(characterName),
                        profile: getImageUrl($(el).find('.character-profile img')),
                        role: sanitizeText(role),
                    },
                });
            }
        });

        return {
            id: id || '',
            name: sanitizeText(name),
            profile: image,
            japaneseName: sanitizeText(japaneseName),
            about: {
                description: sanitizeText(description),
                style: $('.va-about, .about').html() || '',
            },
            roles: roles,
        };
    }
}

module.exports = CharacterExtractor;
