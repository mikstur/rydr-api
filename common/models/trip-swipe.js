'use strict';

let LoopBackContext = require('loopback-context');
let async = require("async");
let WimtService = require("../../lib/wimt/service");

module.exports = function (TripSwipe) {

    TripSwipe.swipe = function (data, cb) {

        let wimtService = WimtService.create();

        async.waterfall([
            async.constant(data),

            // Create a new TripSwipe
            function (data, next) {
                TripSwipe.create(data, function (err, newTripSwipe) {
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
                }, function (err, tripSwipes) {
                    if (err) return next(err);

                    if (!tripSwipes || tripSwipes.length == 0) {
                        return next(null, newTripSwipe, false);
                    } else {
                        return next(null, newTripSwipe, true);
                    }
                });
            },

            // Handle a match
            function (newTripSwipe, matched, next) {
                if (matched) {
                    let TripModel = TripSwipe.app.models.Trip;
                    let AdventureModel = TripSwipe.app.models.Adventure;
                    let AdventureUserMappingModel = TripSwipe.app.models.AdventureUserMapping;

                    async.waterfall([

                        // Find trips
                        function (innerNext) {
                            TripModel.find({
                                where: {
                                    or: [
                                        { tripId: newTripSwipe.tripId1 },
                                        { tripId: newTripSwipe.tripId2 }
                                    ]
                                },
                                include: ["user"]
                            }, function (err, trips) {
                                if (err) return innerNext(err);

                                return innerNext(null, trips);
                            });
                        },

                        // Find adventure for tripId2 (the first trip that was swiped)
                        function (trips, innerNext) {
                            AdventureModel.find({
                                where: {
                                    tripId: newTripSwipe.tripId2
                                }
                            }, function (err, adventures) {
                                if (err) return innerNext(err);

                                if (!adventures || adventures.length == 0) {
                                    return innerNext(new Error("Failed to find adventure"));
                                }

                                return innerNext(null, trips, adventures[0]);
                            });
                        },

                        // Find journey of adventure and calculate adventure expiry time
                        function (trips, adventure, innerNext) {

                            if (!adventure.externalJourneyId) {
                                return innerNext(new Error("no external journey id"));
                            }

                            wimtService.getJourney(adventure.externalJourneyId, function (err, journey) {
                                if (err) return innerNext(err);

                                if (!journey.itineraries || journey.itineraries.length == 0) {
                                    return innerNext(new Error("No itinerary"));
                                }

                                var arrivalTime = new Date(journey.itineraries[0].arrivalTime);
                                arrivalTime.setHours(arrivalTime.getHours() + 1);

                                return innerNext(null, trips, adventure, arrivalTime);
                            });
                        },

                        // Add both users to the adventure
                        function (trips, adventure, adventureExpiryDate, innerNext) {

                            async.each(trips, function (trip, eachCb){
                                AdventureUserMappingModel.create({
                                    adventureId: adventure.adventureId,
                                    userId: trip.userId,
                                    expiresOn: adventureExpiryDate
                                }, function(err, newAdventureUserMapping) {
                                    if (err) return eachCb(err);

                                    return eachCb();
                                });
                            }, function(err) {
                                if (err) return innerNext(err);

                                return innerNext(null, matched);
                            });
                        }
                    ], function (err, innerResult) {
                        if (err) return next(err);

                        return next(null, true); // true = matched...
                    });
                } else {
                    return next(null, matched);
                }
            }

        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });

    }

}