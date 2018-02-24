/**
 * Follow controller
 *
 */

module.exports = {
  /**
   * list authenticated user follows
   */
  find(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    // only show current user records
    res.locals.query.where.userId = req.user.id;

    res.locals.Model
    .findAndCountAll(res.locals.query)
    .then(function (record) {
      res.locals.metadata.count = record.count;
      // get title field for each follow
      req.we.utils.async.eachSeries(record.rows, (r, next)=> {
        if (!req.we.db.models[r.model]) return next();
        r.getRelatedRecordTitle(next);
      }, function (err) {
        if (err) return res.serverError(err);

        res.locals.data = record.rows;
        return res.ok();
      });

      return null;
    })
    .catch(res.queryError);
  },

  /**
   * get Follow status for one model
   */
  isFollowing(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    let query = {};
    let userId = req.user.id;

    if (!req.params.model) {
      we.log.warn('Model name not found', req.params.model, req.params.modelId);
      return res.badRequest();
    }

    query.model = req.params.model;
    if (req.params.modelId) query.modelId = req.params.modelId;
    if (userId) query.userId = userId;

    we.db.models.follow
    .findAll({
      where: query
    })
    .then( (records)=> {
      res.send({
        follow: records
      });

      return null;
    });
  },

  /**
   * Follow something
   */
  follow(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.getWe();

    if (!req.params.model || !req.params.modelId) {
      we.log.warn('Model name or modelId not found', req.params.model, req.params.modelId);
      return res.badRequest();
    }

    we.utils.async.series([
      function checkIfFollow(done) {
        // follow
        we.db.models.follow.follow(req.params.model, req.params.modelId, req.user.id, (err, follow)=> {
          if (err) return done(err);
          if (!follow) return res.forbidden();

          res.locals.data = follow;

          done();
        });
      },
      function renderTemplate (done) {
        res.locals.formHtml = we.view.renderTemplate('flag/getModelFollow', res.locals.theme, res.locals);
        done();
      }
    ], function (err) {
      if (err) return res.queryError(err);

      if (res.locals.data && we.io) {
        // send the change to others user connected devices
        we.io.sockets.in('user_' + req.user.id).emit(
          'follow:follow', {
            follow: res.locals.data,
            formHtml: res.locals.formHtml
          }
        );
      }

      if (res.locals.redirectTo && !req.query.contentOnly) {
        return res.redirect(res.locals.redirectTo);
      } else {
        return res.send({
          follow: res.locals.data,
          formHtml: res.locals.formHtml
        });
      }
    });
  },

  unFollow(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    const we = req.we;

    if (!req.params.model || !req.params.modelId) {
      we.log.warn('unFollow:Model name or modelId not found', req.params.model, req.params.modelId);
      return res.badRequest();
    }

    we.utils.async.series([
      function unFollow(done){
        we.db.models.follow
        .unFollow(req.params.model, req.params.modelId, req.user.id, function (err) {
          if (err) return res.serverError(err);
          done();
        });
      },
      function renderTemplate (done) {
        res.locals.formHtml = we.view.renderTemplate('flag/getModelFollow', res.locals.theme, res.locals);
        done();
      }
    ], function (err) {
      if (err) return res.queryError(err);

      if (res.locals.data && we.io) {
        // send the change to others user connected devices
        we.io.sockets.in('user_' + req.user.id).emit(
          'follow:unFollow', {
            follow: null,
            formHtml: res.locals.formHtml
          }
        );
      }

      if (res.locals.redirectTo && !req.query.contentOnly) {
        return res.redirect(res.locals.redirectTo);
      } else {
        return res.send({
          follow: null,
          formHtml: res.locals.formHtml
        });
      }
    });
  }
};
