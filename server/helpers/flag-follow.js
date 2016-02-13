/**
 * We {{flag-follow}}  helper
 *
 * usage:
 * {{{flag-follow
 *   modelName='post'
 *   modelId=''
 *   isFollowing=record.metadata.isFollowing
 *   locals=locals
 * }}}
 */

module.exports = function(we) {
  return function helper() {
    var options = arguments[arguments.length-1];

    if (!options.hash.locals) {
      we.log.warn('we-plugin-flag:helper:flag-follow: locals, modelId or modelName  attr is required');
      return '';
    }

    return we.view.renderTemplate('flag/follow', options.hash.locals.theme, {
      isFollowing: options.hash.isFollowing,
      modelId: options.hash.modelId,
      modelName: options.hash.modelName,
      locals: options.hash.locals
    });
  }
}