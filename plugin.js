/**
 * We.js flag plugin main file
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    flag: {
      available: {
        like: {}
      },
      models: {
        // post: true,
        // group: true
      }
    },
    follow: {
      models: {
        // post: true,
        // group: true,
        // user: true
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

    // current user follow list
    'get /follow': {
      controller    : 'follow',
      model         : 'follow',
      action        : 'find',
      permission    : 'use_follow',
      layoutName    : 'fullwidth',
      titleHandler  : 'i18n',
      titleI18n     : 'notification.follow',
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
      template      : 'flag/getModelFlags',
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

  plugin.events.on('we:after:load:plugins', (we)=> {
    plugin.follow = {
      loadFollowForfindAll(records, opts, done) {
        if (!records) return done();

        if (we.utils._.isArray(records)) {
          we.utils.async.each(records, (r, next)=> {
            plugin.follow.loadFollowForRecord(r, opts, next);
          }, done);
        } else {
          plugin.follow.loadFollowForRecord(records, opts, done);
        }
      },
      loadFollowForRecord(r, opts, done) {
        done();
      },
      destroy(r) {
        return new Promise( (resolve, reject)=> {
          if (!r) return resolve();

          let where;

          if (this.name === 'user') {
            where = {
              [we.Op.or]: [
                { userId: r.id },
                { model: this.name, modelId: r.id }
              ]
            };
          } else {
            where = { model: this.name, modelId: r.id };
          }

          we.db.models.follow
          .destroy({
            where: where
          })
          .then( (result)=> {
            we.log.debug('Deleted ' + result + ' follow records from record with id: ' + r.id);
            resolve();
            return null;
          })
          .catch(reject);
        });
      }
    };

    plugin.flag = {
      destroy(r) {
        return new Promise( (resolve, reject)=> {
          if (!r) return resolve();

          let where;

          if (this.name === 'user') {
            where = {
              [we.Op.or]: [
                { userId: r.id },
                { model: this.name, modelId: r.id }
              ]
            };
          } else {
            where = { model: this.name, modelId: r.id };
          }

          we.db.models.flag
          .destroy({
            where: { model: this.name, modelId: r.id }
          })
          .then( (result)=> {
            we.log.debug('Deleted ' + result + ' flag records from record with id: ' + r.id);
            resolve();
            return null;
          })
          .catch(reject);
        });
      }
    };
  });

  // // set flag and follow fields
  plugin.hooks.on('we:models:before:instance', (we, done)=> {
    let modelName;

    for (modelName in we.config.follow.models) {
      // skip if model = false
      if (!we.config.follow.models[modelName]) continue;

      if (!we.db.modelsConfigs[modelName].associations)
        we.db.modelsConfigs[modelName].associations = {};

      we.db.modelsConfigs[modelName].associations.follow = {
        type: 'hasOne',
        model: 'follow',
        foreignKey: 'modelId',
        constraints: false,
        scope: {
          model: modelName
        }
      }
    }

    // user following attr
    we.db.modelsConfigs.user.associations.following = {
      type: 'hasOne',
      model: 'follow',
      foreignKey: 'userId',
      constraints: false
    }

    done();
  });

  // set sequelize hooks
  plugin.hooks.on('we:models:set:joins', function setFlagHooks(we, done) {
    const models = we.db.models;
    let enableFlag, enableFollow;

    for (let modelName in models) {
      enableFlag = plugin.modelHaveFlag(we, modelName);
      enableFollow = plugin.modelHaveFollow(we, modelName);

      if (enableFollow) {
        we.db.models[modelName].addHook('afterDestroy', 'destroyModelFollows', plugin.follow.destroy);
      }

      if (enableFlag) {
        we.db.models[modelName].addHook('afterDestroy', 'destroyModelFlags', plugin.flag.destroy);
      }
    }

    done();
  });

  // use this hook in one we.js plugin to change a res.ok response
  plugin.hooks.on('we:before:send:okResponse', (data, done)=> {
    // {
    //   req: req,
    //   res: res,
    //   data: data
    // }

    if (!data.res.locals.data || !data.res.locals.model) return done();

    const modelName = data.res.locals.model;
    const functions = [];
    const req = data.req;
    const async = data.req.we.utils.async;
    const flag = req.we.db.models.flag;
    let records, record, userId;

    if (req.user) {
      userId = req.user.id
    } else {
      userId = null
    }

    if (req.we.utils._.isArray(data.res.locals.data)) {
      records = data.res.locals.data;
    } else {
      record = data.res.locals.data;
    }

    if (plugin.modelHaveFlag(req.we, modelName)) {
      if (records) {
        functions.push( (done)=> {
          // load current user flag status for records in lists
          async.each(records, (record, next)=> {
            if (!record.metadata) record.metadata = {};

           flag.getCountAndUserStatus(userId, modelName, record.id, 'like', (err, result)=> {
             if (err) return next(err);

             record.metadata.isFlagged = result.isFlagged;
             record.metadata.flagCount = result.count;
             next();

           });
          }, done);
        });

      } else if (record) {
        functions.push( (done)=> {
          if (!record.metadata) record.metadata = {};

          flag.getCountAndUserStatus(userId, modelName, record.id, 'like', (err, result)=> {
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
        functions.push( (done)=> {
          let recordIds = records.map( (r)=> {
            return r.id;
          });

          if (data.req.we.utils._.isEmpty(recordIds)) return done();

          req.we.db.models.follow.findAll({
            where: {
              userId: userId,
              model: modelName,
              modelId: recordIds
            }
          })
          .then( (followings)=> {
            followings.forEach( (f)=> {
              for (let i = records.length - 1; i >= 0; i--) {
                if (records[i].id === f.modelId) {
                  if (!records[i].metadata) records[i].metadata = {};
                  records[i].metadata.isFollowing = f;
                  break;
                }
              }
            })

            done();
            return null;
          })
          .catch(done);
        });

      } else if (record) {
        functions.push( (done)=> {
          if (!record.metadata) record.metadata = {};

          if (record.follow) {
            record.metadata.isFollowing = record.follow;
            return done();
          }

          // load current user following status for record
          req.we.db.models.follow.isFollowing(userId, modelName, record.id)
          .then( (isFollowing)=> {
            record.metadata.isFollowing = (isFollowing || false);
            done();
            return null;
          })
          .catch(done);
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

  plugin.addJs('we.flag', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-flag',
    path: 'files/public/we.flag.js'
  });

  return plugin;
};