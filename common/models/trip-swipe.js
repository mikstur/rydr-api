'use strict';

let LoopBackContext = require('loopback-context');
let async = require("async");
let WimtService = require("../../lib/wimt/service");

module.exports = function (TripSwipe) {

    TripSwipe.swipe = function (data, cb) {

        async.waterfall([
            async.constant(data),

            // Create a new TripSwipe
            function (data, next) {
                TripSwipe.create(data, function(err, newTripSwipe) {
                    if (err) return next(err);

                    return next(null, newTripSwipe);
                });
            },

            // See if data.tripId1 has been swiped on already
            function (newTripSwipe, next) {
                TripSwipe.find({
                    where: {
                        and: [
                            { tripId2: newTripSwipe.tripId1 },
                            { tripId1: newTripSwipe.tripId2 }
                        ]
                    }
                }, function(err, tripSwipes) {
                    if (err) return next(err);

                    if (!tripSwipes || tripSwipes.length == 0) {
                        return next(null, false);
                    } else {
                        return next(null, true);
                    }
                });
            }

        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });

    }

}