'use strict';

let async = require('async');

let BaseService = require('../base-service');

class AuthenticationService extends BaseService {

  constructor(app) {
    super(app);
  }

  auth(data, cb) {
    let UserEmailModel = this.app.models.UserEmail;
    let RbgUserModel = this.app.models.RbgUser;
    let AccessTokenModel = this.app.models.AccessToken;

    /**
     * 1. Find userId by emailAddress
     * 2. Find the user by userId
     * 3. Hash the input password
     * 4. Compare the hashed input password with the stored hashed password
     */

    // credentials from the request body
    let userCredentials = {
      email: data.email,
      password: data.password,
    };

    async.waterfall([
      findUserIdByEmailAddress,
      findUserByUserId,
      comparePasswords,
      createAccessTokenForUser,
    ], function (err, result) {
      // result now equals access token
      if (err) return cb(err);

      return cb(null, result);
    });

    function findUserIdByEmailAddress(callback) {
      UserEmailModel.findOne({
        where: {
          and: [
            { email: userCredentials.email },
            { isActive: true },
          ],
        },
      }, function (err, userEmail) {
        if (err) return callback(err, null);
        if (!userEmail) {
          var unauthorised = new Error('User credentials invalid');
          unauthorised.statusCode = 401;
          return callback(unauthorised, null);
        }

        return callback(null, userEmail.userId);
      });
    }

    function findUserByUserId(userId, callback) {
      RbgUserModel.findOne({
        where: {
          id: userId,
        },
      }, function (err, rbgUser) {
        if (err) return callback(err);

        // TODO: Return HTTP 401
        if (!rbgUser) {
          var unauthorised = new Error('User credentials invalid');
          unauthorised.statusCode = 401;
          return callback(unauthorised, null);
        }

        return callback(null, rbgUser);
      });
    }

    function comparePasswords(rbgUser, callback) {
      rbgUser.hasPassword(userCredentials.password, function (err, isMatch) {
        if (err) return callback(err);

        if (!isMatch) {
          var unauthorised = new Error('User credentials invalid');
          unauthorised.statusCode = 401;
          return callback(unauthorised, null);
        }

        return callback(null, rbgUser);
      });
    }

    function createAccessTokenForUser(rbgUser, callback) {
      AccessTokenModel.create({
        userId: rbgUser.id,
      }, function (err, newAccessToken) {
        if (err) return callback(err);

        return callback(null, newAccessToken);
      });
    }
  }//forgot passowrd 
  forgot(data, cb) {
    let user = this.app.models.RbgUser;
    user.resetPassword({ email: data.email }, function (err) { return (cb(err)) });
  }

  //reset with NEW password
  reset(data, cb) {
    var self = this;

    let user = this.app.models.RbgUser;
    //    user.resetPassword({password: data.password, token: data.token}, function(err){ return(cb(err))});
    console.log("Password: " + data.password);
    console.log("Token: " + data.token);

    //data.token
    let token = this.app.models.AccessToken;
    token.findOne({ id: data.token }, function (err, foundToken) {
      if (err) {
        console.log("could not find token");
        return cb(err, null);
      }

      if (!foundToken) {
        return cb(new Error("Token not found"). null);
      }

      console.log("got token. querying rbguser");
      let rbgUser = self.app.models.RbgUser;

      rbgUser.findOne({ id: foundToken.userId }, function (err, foundRbgUser) {
        if (err) {
          return cb(err, null);
        }

        else {
          console.log("got user. updating pwd rbguser");

          foundRbgUser.updateAttribute('password', data.password, function (err, updatedUuser) {
            if (err) {
              return cb(err, null);
            }
            else {
              console.log("updated password");

              return cb(null, { message: "updated password" });
            }
          });
          ///replace and save password.


        }
      });
    });
  }
}
//findone rbguser function

module.exports = AuthenticationService;
