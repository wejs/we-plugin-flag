/**
 * Follow
 *
 * @module      :: Model
 * @description :: Flag how store things how users are following
 */

module.exports = function Model(we) {
  var model = {
    definition: {
      /**
       * model name ex.: post
       */
      model: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },

      /**
       * mode id ex.: post.id
       */
      modelId: {
        type: we.db.Sequelize.BIGINT,
        allowNull: false
      }
    },

    associations: {
      user:  {
        type: 'belongsTo',
        model: 'user'
      }
    },

    options: {
      classMethods: {
        /**
         * Get query to check if user is following
         *
         * @return {object} sequelize findOne query object
         */
        isFollowing: function isFollowing(userId, modelName, modelId){
          return we.db.models.follow.findOne({
            where: {
              userId: userId,
              model: modelName,
              modelId: modelId
            }
          });
        },

        follow: function follow(modelName, modelId, userId,  cb) {
          // check if record exists
          we.db.models.follow.recordExists(modelName, modelId, function (err, record) {
            if (err) return cb(err);
            if (!record) return cb('record to follow not exists');

            // check if is following
            we.db.models.follow.isFollowing(userId, modelName, modelId)
            .then(function (follow) {
              if (follow) return cb(null, follow);

              we.db.models.follow.create({
                userId: userId,
                model: modelName,
                modelId: modelId
              }).then(function (salvedFollow) {
                return cb(null, salvedFollow);
              }).catch(cb);
            }).catch(cb);
          })
        },

        unFollow: function(modelName, modelId, userId,  cb) {
          // check if is following
          we.db.models.follow.isFollowing(
            userId, modelName, modelId)
          .then(function (follow) {
            if (!follow) return cb(null, null);
            follow.destroy()
            .then(function(r) { cb(null, r); });
          });
        },

        /**
         * Check if one record or model type exists and returns it on callback
         */
        recordExists: function (modelName, modelId, cb) {
          if (!we.db.models[modelName])
            return cb('Model type dont exist.');
          we.db.models[modelName].findById(modelId).then(function(r) { cb(null, r); });
        },

        getUsersFollowing: function(modelName, modelId) {
          return we.db.models.follow.find({
            where: {
              model: modelName,
              modelId: modelId
            }
          })
        }
      }
    }
  }
  return model;
}
