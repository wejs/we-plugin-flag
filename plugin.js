/**
 * We.js plugin config
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    flag: {
      available: {
        like: {}
      }
    }
  });
  // set plugin routes
  plugin.setRoutes({
    // -- FOLLOW
    // get
    // example: /api/v1/follow/post/1/2?flagType=follow
    'get /api/v1/follow/:model/:modelId([0-9]+)?': {
      controller    : 'follow',
      action        : 'isFollowing',
      responseType  : 'json',
      permission    : 'use_follow'
    },

    // create
    // example: /api/v1/follow/post/1/2?flagType=follow
    'post /api/v1/follow/:model/:modelId([0-9]+)': {
      controller    : 'follow',
      action        : 'follow',
      responseType  : 'json',
      permission    : 'use_follow'
    },

    // delete
    // example: /api/v1/follow/post/1/2?flagType=follow
    'delete /api/v1/follow/:model/:modelId([0-9]+)': {
      controller    : 'follow',
      action        : 'unFollow',
      responseType  : 'json',
      permission    : 'use_follow'
    },
    // -- FLAG

    // get
    // example: /api/v1/flag/post/1/2?flagType=follow
    'get /api/v1/flag/:model/:modelId?/:userId?': {
      controller    : 'flag',
      action        : 'getModelFlags',
      responseType  : 'json',
      permission    : 'use_flag'
    },
    // create
    // example: /api/v1/flag/post/1/2?flagType=follow
    'post /api/v1/flag/:model/:modelId': {
      controller    : 'flag',
      action        : 'flag',
      responseType  : 'json',
      permission    : 'use_flag'
    },

    // delete
    // example: /api/v1/flag/post/1/2?flagType=follow
    'delete /api/v1/flag/:model/:modelId': {
      controller    : 'flag',
      action        : 'unFlag',
      responseType  : 'json',
      permission    : 'use_flag'
    }
  });

  return plugin;
};