/**
 * Follow
 *
 * @module      :: Model
 * @description :: Flag how store things how users are following
 */

module.exports = function Model(we) {
  const model = {
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
      },

      /**
       * cache for followed record title field
       * @type {Object}
       */
      relatedTitleField: {
        type: we.db.Sequelize.VIRTUAL
      }
    },

    associations: {
      user:  {
        type: 'belongsTo',
        model: 'user'
      }
    },

    options: {
      instanceMethods: {

        getRelatedRecordTitle(cb) {
          // related model not found
          if (!we.db.models[this.model]) return cb();
          // cache
          if (this.relatedTitleField) return cb(null, this.relatedTitleField);

          let titleField = we.db.models[this.model].options.titleField;
          if (!titleField) {
            return cb(null, this.getGenericRelatedRecordTitle());
          }

          const self = this;
          we.db.models[this.model].findOne({
            where: {
              id: this.modelId
            },
            attributes: [titleField]
          })
          .then( (r)=> {
            if (!r || !r.get(titleField)) {
              cb(null, self.getGenericRelatedRecordTitle());
              return null;
            }

            self.relatedTitleField = r.get(titleField);
            cb(null, self.relatedTitleField);
            return null;
          })
          .catch(cb);
        },

        getGenericRelatedRecordTitle() {
          // this model dont have a titleField
          return this.relatedTitleField = this.model +'/'+ this.modelId;
        }
      },
      classMethods: {
        /**
         * Get query to check if user is following
         *
         * @return {object} sequelize findOne query object
         */
        isFollowing(userId, modelName, modelId) {
          return we.db.models.follow
          .findOne({
            where: {
              userId: userId,
              model: modelName,
              modelId: modelId
            }
          });
        },

        follow(modelName, modelId, userId,  cb) {
          // check if record exists
          we.db.models.follow
          .recordExists(modelName, modelId, (err, record)=> {
            if (err) return cb(err);
            if (!record) return cb('record to follow not exists');

            // check if is following
            we.db.models.follow
            .isFollowing(userId, modelName, modelId)
            .then( (follow)=> {
              if (follow) {
                cb(null, follow);
                return null;
              }

              return we.db.models.follow
              .create({
                userId: userId,
                model: modelName,
                modelId: modelId
              })
              .then( (salvedFollow)=> {
                cb(null, salvedFollow);
                return null;
              })
            })
            .catch((err)=> {
              we.log.error(err);
              cb(err);
            });
          });
        },

        unFollow(modelName, modelId, userId,  cb) {
          // check if is following
          we.db.models.follow
          .isFollowing(
            userId, modelName, modelId)
          .then( (follow)=> {
            if (!follow) {
              cb(null, null);
              return null;
            }

            return follow
            .destroy()
            .then((r)=> {
              cb(null, r);
              return null;
            });
          })
          .catch(cb)
        },

        /**
         * Check if one record or model type exists and returns it on callback
         */
        recordExists(modelName, modelId, cb) {
          if (!we.db.models[modelName]) {
            return cb('Model type dont exist.');
          }
          we.db.models[modelName]
          .findById(modelId)
          .then( (r)=> {
            cb(null, r);
            return null;
          })
          .catch(cb);
        },

        getUsersFollowing(modelName, modelId) {
          return we.db.models.follow
          .find({
            where: {
              model: modelName,
              modelId: modelId
            }
          });
        }
      }
    }
  }
  return model;
}
