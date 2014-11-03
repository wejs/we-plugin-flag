/**
 * Routes
 *
 * Sails uses a number of different strategies to route requests.
 * Here they are top-to-bottom, in order of precedence.
 *
 * For more information on routes, check out:
 * http://sailsjs.org/#documentation
 */



/**
 * (1) Core middleware
 *
 * Middleware included with `app.use` is run first, before the router
 */


/**
 * (2) Static routes
 *
 * This object routes static URLs to handler functions--
 * In most cases, these functions are actions inside of your controllers.
 * For convenience, you can also connect routes directly to views or external URLs.
 *
 */

module.exports.routes = {
  // -- FLAG

  // get
  // example: /api/v1/flag/post/1/2?flagType=follow
  'get /api/v1/flag/:model/:modelId?/:userId?': {
    controller    : 'FlagController',
    action        : 'getModelFlags'
  },

  // create
  // example: /api/v1/flag/post/1/2?flagType=follow
  'post /api/v1/flag/:model/:modelId': {
    controller    : 'FlagController',
    action        : 'flag'
  },

  // delete
  // example: /api/v1/flag/post/1/2?flagType=follow
  'delete /api/v1/flag/:model/:modelId': {
    controller    : 'FlagController',
    action        : 'unFlag'
  }

};
