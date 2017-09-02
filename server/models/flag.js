/**
 * Flag
 *
 * @module      :: Model
 * @description :: Flag how store things how users are following
 */

module.exports = function Model(we) {
  const model = {
    definition: {
      /**
       * type
       */
      flagType: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },

      /**
       * flagged model name ex.: post
       */
      model: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },

      /**
       * flagged mode id ex.: post.id
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
         * @return {object} waterline findOne query object
         */
        isFlagged(flagType ,userId, modelName, modelId){
          return we.db.models.flag.find({
            where: {
              flagType: flagType,
              userId: userId,
              model: modelName,
              modelId: modelId
            }
          });
        },
        /**
         * Check if one record or model type exists and returns it on callback
         */
        recordExists(modelName, modelId, cb) {
          let RelatedModel = we.db.models[modelName];
          if(!RelatedModel) {
            return cb('Model type dont exist.');
          }

          RelatedModel.findById(modelId)
          .then( (r)=> {
            cb(null, r);
            return null;
          })
          .catch(cb);
        },

        getCountAndUserStatus(userId, modelName, modelId, flagType, done) {
          we.db.models.flag.count({
            where: {
              model: modelName,
              modelId: modelId,
              flagType: flagType
            }
          })
          .then( (count)=> {
            if (!count || !userId) {
              done(null, {
                isFlagged: false,
                count: count || 0
              });
              return null;
            }

            return we.db.models.flag.isFlagged(flagType, userId, modelName, modelId)
            .then( (isFlagged)=> {
              done(null, {
                isFlagged: Boolean(isFlagged),
                count: count
              });
              return null;
            })
            .catch(done);
          })
          .catch(done);
        }
      }
    }
  }

  return model;
}