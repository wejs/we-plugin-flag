/**
 * We.js flag plugin main file
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    flag: {
      available: {
        like: {}
      },
      models: {
        post: true,
        group: true
      }
    },
    follow: {
      models: {
        post: true,
        group: true,
        user: true
      }
    }
  });
  // set plugin routes
  plugin.setRoutes({
    // -- FOLLOW
    // get
    // example: /api/v1/follow/post/1
    'get /api/v1/follow/:model/:modelId([0-9]+)': {
      controller    : 'follow',
      action        : 'isFollowing',
      responseType  : 'json',
      permission    : 'use_follow'
    },

    // create
    // example: /api/v1/follow/post/1
    'post /api/v1/follow/:model/:modelId([0-9]+)': {
      controller    : 'follow',
      action        : 'follow',
      permission    : 'use_follow'
    },

    // delete
    // example: /api/v1/unfollow/post/1
    'post /api/v1/unfollow/:model/:modelId([0-9]+)': {
      controller    : 'follow',
      action        : 'unFollow',
      permission    : 'use_follow'
    },
    // -- FLAG

    // get
    // example: /api/v1/flag/post/1?flagType=follow
    'get /api/v1/flag/:model/:modelId([0-9]+)': {
      controller    : 'flag',
      action        : 'getModelFlags',
      responseType  : 'json',
      permission    : 'use_flag'
    },
    // create
    // example: /api/v1/flag/post/1?flagType=follow
    'post /api/v1/flag/:model/:modelId([0-9]+)': {
      controller    : 'flag',
      action        : 'flag',
      permission    : 'use_flag'
    },

    // delete
    // example: /api/v1/unflag/post/1?flagType=follow
    'post /api/v1/unflag/:model/:modelId([0-9]+)': {
      controller    : 'flag',
      action        : 'unFlag',
      permission    : 'use_flag'
    }
  });

  plugin.events.on('we:after:load:plugins', function (we) {
    plugin.follow = {
      loadFollowForfindAll: function(records, opts, done) {
        if (!records) return done();

        if (we.utils._.isArray(records)) {
          we.utils.async.each(records, function (r, next) {
            plugin.follow.loadFollowForRecord(r, opts, next);
          }, done);
        } else {
          plugin.follow.loadFollowForRecord(records, opts, done);
        }
      },
      loadFollowForRecord: function (r, opts, done) {
        done();
      },
      destroy: function destroyFollow(r, opts, done) {
        if (!r) return done();

        var where;

        if (this.name === 'user') {
          where = {
            $or: [
              { userId: r.id },
              { model: this.name, modelId: r.id }
            ]
          };
        } else {
          where = { model: this.name, modelId: r.id };
        }

        we.db.models.follow.destroy({
          where: where
        }).then(function (result) {
          we.log.debug('Deleted ' + result + ' follow records from record with id: ' + r.id);
          return done();
        }).catch(done);
      }
    };

    plugin.flag = {
      destroy: function destroyFlag(r, opts, done) {
        if (!r) return done();

        var where;

        if (this.name === 'user') {
          where = {
            $or: [
              { userId: r.id },
              { model: this.name, modelId: r.id }
            ]
          };
        } else {
          where = { model: this.name, modelId: r.id };
        }

        we.db.models.flag.destroy({
          where: { model: this.name, modelId: r.id }
        }).then(function (result) {
          we.log.debug('Deleted ' + result + ' flag records from record with id: ' + r.id);
          return done();
        }).catch(done);
      }
    };
  });

  // // set flag and follow fields
  // plugin.hooks.on('we:models:before:instance', function (we, done) {
  //   var modelName;

  //   for (modelName in we.config.flag.models) {
  //     we.db.modelsConfigs[modelName].definition.isFlagged = {
  //       type: we.db.Sequelize.VIRTUAL,
  //       formFieldType: null
  //     };
  //     we.db.modelsConfigs[modelName].definition.flagCount = {
  //       type: we.db.Sequelize.VIRTUAL,
  //       formFieldType: null
  //     };
  //   }

  //   for (modelName in we.config.follow.models) {
  //     we.db.modelsConfigs[modelName].definition.isFollowing = {
  //       type: we.db.Sequelize.VIRTUAL,
  //       formFieldType: null
  //     };
  //   }

  //   done();
  // });

  // set sequelize hooks
  plugin.hooks.on('we:models:set:joins', function setFlagHooks(we, done) {
    var models = we.db.models;
    var enableFlag, enableFollow;

    for (var modelName in models) {
      enableFlag = plugin.modelHaveFlag(we, modelName);
      enableFollow = plugin.modelHaveFollow(we, modelName);

      if (enableFollow) {
        // we.db.models[modelName].addHook('afterFind', 'findFollow', plugin.follow.loadFollowForfindAll);
        we.db.models[modelName].addHook('afterDestroy', 'destroyModelFollows', plugin.follow.destroy);
      }

      if (enableFlag) {
        // we.db.models[modelName].addHook('afterFind', 'findFlags', we.router.alias.afterCreatedRecord);
        we.db.models[modelName].addHook('afterDestroy', 'destroyModelFlags', plugin.flag.destroy);
      }
    }

    done();
  });

  // use this hook in one we.js plugin to change a res.ok response
  plugin.hooks.on('we:before:send:okResponse', function (data, done) {
    // {
    //   req: req,
    //   res: res,
    //   data: data
    // }

    if (!data.res.locals.data || !data.res.locals.model) return done();

    var modelName = data.res.locals.model;
    var functions = [];
    var req = data.req;
    var records, record;
    var async = data.req.we.utils.async;
    var flag = req.we.db.models.flag;

    if (req.we.utils._.isArray(data.res.locals.data)) {
      records = data.res.locals.data;
    } else {
      record = data.res.locals.data;
    }

    if (plugin.modelHaveFlag(req.we, modelName)) {
      if (records) {
        functions.push( function (done) {
          // load current user flag status for records in lists
          async.each(records, function (record, next) {
            if (!record.metadata) record.metadata = {};

           flag.getCountAndUserStatus(req.user.id, modelName, record.id, 'like', function (err, result){
             if (err) return next(err);

             record.metadata.isFlagged = result.isFlagged;
             record.metadata.flagCount = result.count;
             next();

           });
          }, done);
        });

      } else {
        functions.push( function (done) {
          if (!record.metadata) record.metadata = {};

          flag.getCountAndUserStatus(req.user.id, modelName, record.id, 'like', function (err, result){
            if (err) return done(err);

            record.metadata.isFlagged = result.isFlagged;
            record.metadata.flagCount = result.count;
            done();

          });
        });
      }
    }

    if (req.isAuthenticated() && plugin.modelHaveFollow(req.we, modelName)) {
      if (records) {
        functions.push( function (done) {
          // load current user following status for records in lists
          async.each(records, function (record, next) {
            req.we.db.models.follow.isFollowing(req.user.id, modelName, record.id)
            .then(function (isFollowing) {
              if (!record.metadata) record.metadata = {};
              record.metadata.isFollowing = (isFollowing || false);
              next();
            }).catch(next);
          }, done);
        });

      } else {
        functions.push( function (done) {
          // load current user following status for record
          req.we.db.models.follow.isFollowing(req.user.id, modelName, record.id)
          .then(function (isFollowing) {

            if (!record.metadata) record.metadata = {};

            record.isFollowing = (isFollowing || false);
            done();
          }).catch(done);
        });
      }
    }

    data.req.we.utils.async.parallel(functions, done);
  });

  plugin.modelHaveFlag = function modelHaveFlag(we, modelName) {
    if (we.config.flag.models[modelName]) {
      return true;
    } else {
      return false;
    }
  }

  plugin.modelHaveFollow = function modelHaveFollow(we, modelName) {
    if (we.config.follow.models[modelName]) {
      return true;
    } else {
      return false;
    }
  }

  return plugin;
};