/**
 * Anime Parser - Parser for anime series content
 */

const BaseExtractor = require('./extractors/base');
const InfoExtractor = require('./extractors/infoExtractor');
const EpisodeExtractor = require('./extractors/episodeExtractor');
const StreamExtractor = require('./extractors/streamExtractor');
const config = require('../config');

/**
 * Anime Parser for handling anime series content
 */
class AnimeParser extends BaseExtractor {
    constructor() {
        super(config.baseUrl);
        this.infoExtractor = new InfoExtractor();
        this.episodeExtractor = new EpisodeExtractor();
        this.streamExtractor = new StreamExtractor();
    }

    /**
     * Get info for an anime
     * @param {string} id - Anime ID
     * @returns {object} - Anime info
     */
    async getInfo(id) {
        return this.infoExtractor.extract(id);
    }

    /**
     * Get episodes for an anime
     * @param {string} id - Anime ID
     * @returns {object} - Episodes data
     */
    async getEpisodes(id) {
        return this.episodeExtractor.extract(id);
    }

    /**
     * Get stream links for an episode
     * @param {string} episodeId - Episode ID (format: id-1x1)
     * @param {string} lang - Preferred language (default: 'hindi')
     * @returns {object} - Stream data
     */
    async getStream(episodeId, lang = 'hindi') {
        return this.streamExtractor.extract(episodeId, lang);
    }

    /**
     * Get complete anime data
     * @param {string} id - Anime ID
     * @returns {object} - Complete anime data
     */
    async getComplete(id) {
        const [info, episodes] = await Promise.all([
            this.getInfo(id),
            this.getEpisodes(id),
        ]);

        return {
            success: true,
            id: id,
            info: info,
            episodes: episodes,
        };
    }
}

module.exports = AnimeParser;
