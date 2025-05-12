/**
 * Day.js IsToday Plugin
 * 
 * Description: IsToday adds `.isToday()` API to returns a boolean indicating if the dayjs object is today or not.
 * Source: https://cdn.jsdelivr.net/npm/dayjs@1.11.13/plugin/isToday.js
 * Version: Compatible with Day.js v1.11.13
 * Documentation: https://day.js.org/docs/en/plugin/is-today
 */
!function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o():"function"==typeof define&&define.amd?define(o):(e="undefined"!=typeof globalThis?globalThis:e||self).dayjs_plugin_isToday=o()}(this,(function(){"use strict";return function(e,o,t){o.prototype.isToday=function(){var e="YYYY-MM-DD",o=t();return this.format(e)===o.format(e)}}}));