/**
 * FlagController.js
 *
 */

module.exports = {
  _config: {
    rest: false,
    actions: false
  },

  /**
   * get Flag status for one content
   */
  getModelFlags(req, res) {
    const we = req.we;

    if (!req.params.model) {
      we.log.warn('Model name not found', req.params.model, req.params.modelId);
      return res.badRequest();
    }

    if (!res.locals.template) res.locals.template = 'flag/getModelFlags';

    let userId;

    if (req.user) {
      userId = req.user.id;
    } else {
      userId = null;
    }

    we.db.models.flag
    .getCountAndUserStatus(userId, req.params.model, req.params.modelId, req.query.flagType, (err, result)=> {
        if (err) return res.serverError(err);

        res.ok(result);
      }
    );
  },

  /**
   * create one flag
   */
  flag(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    const we = req.we;
    const flagType = req.query.flagType;
    const modelName = req.params.model;
    const modelId = req.params.modelId;
    const userId = req.user.id;

    if (!modelName || !modelId) {
      we.log.warn('Model name or modelId not found', modelName, modelId);
      return res.badRequest();
    }

    if(!flagType) {
      we.log.warn('Cant flag without flagType', modelName, modelId);
      return res.badRequest();
    }

    // check if record exists
    we.db.models.flag.recordExists(modelName, modelId, (err, record)=> {
      if (err) {
        we.log.error('Error on check if model exists to flag', modelName, modelId);
        res.serverError(err);
        return null;
      }

      if (!record) {
        we.log.error('flag:recordExists type id record dont exist.', modelName, modelId);
        res.forbidden();
        return null;
      }

      we.utils.async.series([
        function checkIfIsFlagged(done) {
          // check if is flagged
          we.db.models.flag.isFlagged(flagType ,userId, modelName, modelId)
          .then( (flag)=> {
            // is flagged
            if (flag) res.locals.data = flag;

            done();
            return null;
          })
          .catch(done);
        },
        function createFlag(done) {
          // skip if flag record exists
          if (res.locals.data) return done();

          we.db.models.flag.create({
            flagType: flagType,
            userId: userId,
            model: modelName,
            modelId: modelId
          })
          .then( (salvedFlag)=> {
            res.locals.data = salvedFlag;
            res.locals.isCreated = true;
            done();
            return null;
          })
          .catch(done);
        },
        function loadFlagCount(done) {
          we.db.models.flag.count({
            where: {
              model: modelName, modelId: modelId, flagType: flagType
            }
          })
          .then( (count)=> {
            res.locals.metadata.count = count;
            done();
            return null;
          })
          .catch(done);
        },
        function renderTemplate (done) {
          res.locals.formHtml = we.view.renderTemplate('flag/getModelFlags', res.locals.theme, res.locals);
          done();
        }
      ], (err)=> {
        if (err) return res.queryError(err);

        if (res.locals.isCreated && we.io) {
          // send the change to others user connected devices
          we.io.sockets.in('user_' + userId).emit(
            'flag:flag', {
              flag: res.locals.data,
              formHtml: res.locals.formHtml,
              count: res.locals.metadata.count
            }
          );
        }

        if (res.locals.redirectTo && !req.query.contentOnly) {
          console.log('rodo');
          return res.redirect(res.locals.redirectTo);
        } else {
          return res.send({
            flag: res.locals.data,
            formHtml: res.locals.formHtml,
            count: res.locals.metadata.count
          });
        }
      });

      return null;
    });
  },

  unFlag(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();

    const we = req.we;
    const modelName = req.params.model;
    const modelId = req.params.modelId;
    const userId = req.user.id;
    const flagType = req.query.flagType;

    if (!modelName || !modelId) {
      we.log.warn('unFlag:Model name or modelId not found', modelName, modelId);
      return res.badRequest();
    }

    if(!flagType) {
      we.log.warn('Cant flag without flagType', modelName, modelId);
      return res.badRequest();
    }

    we.utils.async.series([
      function checkIfIsFlagged(done){
        // check if is flagged
        we.db.models.flag.isFlagged(flagType ,userId, modelName, modelId)
        .then( (flag)=> {
          // is flagged
          if (flag) res.locals.oldFlag = flag;

          done();
          return null;
        })
        .catch(done);
      },
      function destroyFlag(done) {
        // skip if flag record not exists
        if (!res.locals.oldFlag) return done();

        we.db.models.flag.destroy({
          where: { id: res.locals.oldFlag.id }
        }).
        then( ()=> {
          res.locals.isDestroyed = true;
          done();
          return null;
        })
        .catch(res.queryError);
      },
      function loadFlagCount(done) {
        we.db.models.flag.count({
          where: {
            model: modelName, modelId: modelId, flagType: flagType
          }
        })
        .then( (count)=> {
          res.locals.metadata.count = count;
          done();
          return null;
        })
        .catch(done);
      },
      function renderTemplate (done) {
        res.locals.formHtml = we.view.renderTemplate('flag/getModelFlags', res.locals.theme, res.locals);
        done();
      }
    ], (err)=> {
      if (err) return res.queryError(err);

      // socket.io pub/sub
      if (res.locals.isDestroyed && we.io) {
        // send the change to others user connected devices
        we.io.sockets.in('user_' + userId).emit(
          'flag:unFlag', {
            flag: res.locals.oldFlag,
            formHtml: res.locals.formHtml,
            count: res.locals.metadata.count
          }
        );
      }

      // send the response or render the component parts
      if (res.locals.redirectTo && !req.query.contentOnly) {
        return res.redirect(res.locals.redirectTo);
      } else {
        return res.send({
          flag: res.locals.oldFlag,
          formHtml: res.locals.formHtml,
          count: res.locals.metadata.count
        });
      }
    });

  }

};
