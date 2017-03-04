'use strict';

let LoopBackContext = require('loopback-context');
let async = require("async");
let WimtService = require("../../../lib/wimt/service");

module.exports = function (Trip) {

    Trip.createAdventure = function (tripId, data, cb) {

        let AdventureModel = Trip.app.models.Adventure;
        let wimtService = WimtService.create();

        async.waterfall([
            async.constant(tripId, data),

            // Find trip
            function (tripId, data, next) {
                Trip.findById(tripId, function (err, trip) {
                    if (err) return next(err);

                    if (!trip) {
                        return next(new Error("Trip not found"));
                    }

                    return next(null, trip, data);
                });
            },

            // Ensure no adventures on this trip already
            function (trip, data, next) {
                AdventureModel.find({
                    where: {
                        and: [
                            { tripId: trip.tripId },
                            { departureTime: { gt: new Date() } }
                        ]
                    }
                }, function (err, adventures) {
                    if (err) return next(err);

                    if (adventures.length > 0) {
                        return next(new Error("Only one adventure allowed"));
                    }

                    return next(null, trip, data);
                })
            },

            // Create Journey
            function (trip, data, next) {
                wimtService.createJourney(trip.origin, trip.destination, function (err, journey) {
                    if (err) return next(err);

                    return next(null, trip, data, journey);
                });
            },

            // Create adventure
            function (trip, data, journey, next) {

                if (!data.departureTime) {
                    return next(new Error("Departure time required"));
                }

                AdventureModel.create({
                    tripId: trip.tripId,
                    departureTime: data.departureTime,
                    externalJourneyId: journey.id
                }, function (err, adventure) {
                    if (err) return next(err);

                    trip.adventure = adventure;
                    return next(null, trip);
                });
            }
        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });
    }

    Trip.getAdventure = function (tripId, cb) {

        let AdventureModel = Trip.app.models.Adventure;
        let wimtService = WimtService.create();

        Trip.find({
            where: {
                tripId: tripId
            }
        }, function (err, trips) {
            if (err) return cb(err);

            async.waterfall([
                async.constant(tripId),

                // Find trip
                function (tripId, next) {
                    Trip.findById(tripId, function (err, trip) {
                        if (err) return next(err);

                        if (!trip) {
                            return next(new Error("Trip not found"));
                        }

                        return next(null, trip);
                    });
                },

                // Ensure no adventures on this trip already
                function (trip, next) {
                    AdventureModel.find({
                        where: {
                            and: [
                                { tripId: trip.tripId },
                                { departureTime: { gt: new Date() } }
                            ]
                        }
                    }, function (err, adventures) {
                        if (err) return next(err);

                        if (adventures.length == 0) {
                            return next(new Error("No adventure found"));
                        }

                        return next(null, adventures[0]);
                    })
                },

                // Get journey
                function (adventure, next) {
                    wimtService.getJourney(adventure.externalJourneyId, function (err, journey) {
                        if (err) return next(err);

                        adventure.journey = journey;

                        return next(null, adventure);
                    });
                }
            ], function (err, result) {
                if (err) return cb(err);

                return cb(null, result);
            });
        });
    }

    Trip.findWithAdventures = function (cb) {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');

        if (!currentUser) {
            var err = new Error("Not authenticated");
            err.statusCode = 401;
            return cb(err, null);
        }

        Trip.find({
            where: {
                userId: currentUser.id
            }
        }, function (err, trips) {
            if (err) return cb(err);

            async.each(trips, function (trip, callback) {

                Trip.app.models.Adventure.find({
                    where: {
                        and: [
                            { tripId: trip.tripId },
                            { departureTime: { gt: new Date() } }
                        ]
                    },
                    order: "departureTime DESC"
                }, function (err, adventures) {
                    if (err) return callback(err);

                    if (!adventures || adventures.length == 0) {
                        trip.adventure = null;
                        return callback();
                    }

                    trip.adventure = adventures[0];

                    return callback();
                });
            }, function (err) {
                if (err) return cb(err);

                return cb(null, trips);
            });
        });
    }

    Trip.costs = function (tripId, cb) {

        var wimtService = WimtService.create();

        async.waterfall([
            async.constant(tripId),

            function (tripId, next) {
                Trip.findById(tripId, function (err, trip) {
                    if (err) return next(err);

                    if (!trip) {
                        var err = new Error("Trip not found");
                        return next(err);
                    }

                    return next(null, trip);
                });
            },

            function (trip, next) {
                wimtService.createJourney(trip.origin, trip.destination, function (err, journey) {
                    if (err) return next(err);

                    return next(null, journey);
                });
            },

            // Calculate car
            function (journey, next) {

                var car = {
                    cost: 0
                };

                try {
                    var totalDistanceMeters = 0;
                    journey.itineraries.forEach(function (itinerary) {
                        totalDistanceMeters += itinerary.distance.value || 0;
                    });

                    var totalDistanceKM = totalDistanceMeters / 1000;

                    car.cost = totalDistanceKM * 3.8;
                } catch (e) {
                    car.cost = 1000;
                }

                return next(null, journey, car);
            },

            // Calculate transits
            function (journey, car, next) {

                var transit = {
                    cost: 0
                };

                if (!journey.itineraries) {
                    transit.cost = car.cost * 4;

                    car.cost = parseFloat(car.cost * 360).toFixed(2);
                    transit.cost = parseFloat(transit.cost * 360).toFixed(2);

                    return next(null, {
                        car: car,
                        transit: transit
                    });
                }

                journey.itineraries.forEach(function (itinerary) {
                    if (!itinerary.legs) {
                        return;
                    }

                    itinerary.legs.forEach(function (leg) {
                        if (!leg.fare) {
                            return;
                        }

                        if (!leg.fare.cost) {
                            return;
                        }

                        transit.cost += leg.fare.cost.amount || 0;
                    });
                });

                car.cost = parseFloat(car.cost * 360).toFixed(2);
                transit.cost = parseFloat(transit.cost * 360).toFixed(2);

                return next(null, {
                    car: car,
                    transit: transit
                });
            }
        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });
    }

    Trip.getPotentialAdventurers = function (tripId, cb) {

        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');

        if (!currentUser) {
            var err = new Error("Not authenticated");
            err.statusCode = 401;
            return cb(err, null);
        }

        var wimtService = WimtService.create();

        async.waterfall([
            async.constant(tripId),

            // Find Trip
            function (tripId, next) {
                Trip.find({
                    where: {
                        tripId: tripId
                    }
                }, function (err, trips) {
                    if (err) return next(err);

                    if (!trips) {
                        return next(new Error("No trips found"));
                    }

                    return next(null, trips[0]);
                });
            },

            // Find other trips where origin is near origin
            function (trip, next) {
                Trip.find({
                    where: {
                        origin: { near: trip.origin, maxDistance: 1, unit: 'kilometers' }
                    },
                    include: ["user"]
                }, function (err, tripsNearOrigin) {
                    if (err) return next(err);

                    return next(null, trip, tripsNearOrigin);
                });
            },

            // Find other trips where destination is near destination
            function (trip, tripsNearOrigin, next) {
                Trip.find({
                    where: {
                        destination: { near: trip.destination, maxDistance: 1, unit: 'kilometers' }
                    },
                    include: ["user"]
                }, function (err, tripsNearDestination) {
                    if (err) return next(err);

                    return next(null, trip, tripsNearOrigin, tripsNearDestination);
                });
            },

            // Create new array where tripsNearOrigin and tripsNearDestination 
            function (trip, tripsNearOrigin, tripsNearDestination, next) {
                var indexedTripsNearOrigin = {};
                tripsNearOrigin.forEach(function (trip) {
                    indexedTripsNearOrigin[trip.tripId] = trip;
                });

                var tripsNearOriginAndDestination = [];
                tripsNearDestination.forEach(function (trip) {
                    if (indexedTripsNearOrigin[trip.tripId]) {
                        if (trip.userId !== currentUser.id) {
                            tripsNearOriginAndDestination.push(trip);
                        }
                    }
                });

                return next(null, tripsNearOriginAndDestination);
            },

            // Ensure trips have got valid adventures
            function (tripsNearOriginAndDestination, next) {

                var validTripWithAdventure = [];

                async.each(tripsNearOriginAndDestination, function (trip, callback) {

                    Trip.app.models.Adventure.find({
                        where: {
                            and: [
                                { tripId: trip.tripId },
                                { departureTime: { gt: new Date() } }
                            ]
                        },
                        order: "departureTime DESC"
                    }, function (err, adventures) {
                        if (err) return callback(err);

                        if (!adventures || adventures.length == 0) {
                            trip.adventure = null;
                            return callback();
                        }

                        trip.adventure = adventures[0];

                        if (!trip.adventure.externalJourneyId) {
                            return callback();
                        }

                        wimtService.getJourney(trip.adventure.externalJourneyId, function (err, journey) {
                            if (err) return callback(err);

                            trip.adventure.journey = journey;
                            validTripWithAdventure.push(trip);
                            return callback();
                        });
                    });
                }, function (err) {
                    if (err) return cb(err);

                    return cb(null, validTripWithAdventure);
                });
            }
        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });

    }

}