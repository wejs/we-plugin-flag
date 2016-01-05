/**
 * We {{flag-like}}  helper
 *
 * usage:
 * {{flag-like
 *   modelName='post'
 *   modelId=''
 *   isFlagged=record.metadata.isFlagged
 *   count=record.metadata.flagCount
 *   locals=locals
 * }}}
 */

module.exports = function(we) {
  return function helper() {
    var options = arguments[arguments.length-1];

    if (!options.hash.locals) {
      we.log.warn('we-plugin-flag:helper:flag-like: locals, modelId or modelName  attr is required');
      return '';
    }

    return we.view.renderTemplate('flag/like', options.hash.locals.theme, {
      flagText: 'flag.' + options.hash.locals.req.query.flagType,
      isFlagged: options.hash.isFlagged,
      count: options.hash.count,
      modelId: options.hash.modelId,
      modelName: options.hash.modelName,
      locals: options.hash.locals,
      redirectTo: options.hash.locals.redirectTo || options.hash.locals.req.url
    });
  }
}