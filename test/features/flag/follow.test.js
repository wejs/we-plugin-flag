const assert = require('assert'),
  request = require('supertest'),
  helpers = require('we-test-tools').helpers,
  stubs = require('we-test-tools').stubs;

let http, we, _;
let salvedPage, salvedUser, salvedUserPassword;
let authenticatedRequest;

describe('followFeature', function () {
  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    _ = we.utils._;

    let userStub = stubs.userStub();
    helpers.createUser(userStub, function(err, user) {
      if (err) {
        we.log.error(err);
        return done(err);
      }

      salvedUser = user;
      salvedUserPassword = userStub.password;

      let pageStub = stubs.pageStub(user.id);
      we.db.models.page.create(pageStub)
      .then(function (p) {
        salvedPage = p;

        // login user and save the browser
        authenticatedRequest = request.agent(http);
        authenticatedRequest.post('/login')
        .set('Accept', 'application/json')
        .send({
          email: salvedUser.email,
          password: salvedUserPassword
        })
        .expect(200)
        .set('Accept', 'application/json')
        .end(function (err) {
          if(err) throw err;
          done();
        });

        return null;
      })
    });
  });

  it('get /api/v1/follow/:model/:modelId? should return empty follow list if user dont are following model', function (done) {
    authenticatedRequest
    .get('/api/v1/follow/page/' + salvedPage.id)
    .set('Accept', 'application/json')
    .end(function (err, res) {
      assert.equal(200, res.status);
      assert(res.body.follow);
      assert( _.isArray(res.body.follow) , 'follow not is array');
      assert( _.isEmpty(res.body.follow));
      done();
    });
  });

  it('post /api/v1/follow/:model/:modelId should follow model', function (done) {

    authenticatedRequest
    .post('/api/v1/follow/page/' + salvedPage.id)
    .set('Accept', 'application/json')
    .end(function (err, res) {
      assert.equal(200, res.status);
      assert(res.body.follow);
      assert(res.body.follow.id);
      assert.equal('page', res.body.follow.model);
      assert.equal(salvedPage.id, res.body.follow.modelId);
      assert.equal(salvedUser.id, res.body.follow.userId);
      done();
    });
  });

  it('post /api/v1/unfollow/:model/:modelId should unfollow model', function (done) {

    authenticatedRequest
    .post('/api/v1/unfollow/page/' + salvedPage.id)
    .set('Accept', 'application/json')
    .end(function (err, res) {
      assert.equal(200, res.status);

      assert( _.isEmpty(res.body.follow) );

      // check if is following
      we.db.models.follow.isFollowing(
        salvedUser.id, 'page', salvedPage.id)
      .then(function (follow) {
        assert( _.isEmpty(follow) );
        done();
      });
    });
  });

});
