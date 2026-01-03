/**
 * Parsers Index - Export all parsers
 */

const AnimeParser = require('./anime');
const CartoonParser = require('./cartoon');
const MoviesParser = require('./movies');
const HomeParser = require('./homeParser');
const BaseExtractor = require('./extractors/base');
const InfoExtractor = require('./extractors/infoExtractor');
const EpisodeExtractor = require('./extractors/episodeExtractor');
const StreamExtractor = require('./extractors/streamExtractor');

module.exports = {
    AnimeParser,
    CartoonParser,
    MoviesParser,
    HomeParser,
    BaseExtractor,
    InfoExtractor,
    EpisodeExtractor,
    StreamExtractor,
};
