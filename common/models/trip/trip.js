'use strict';

let async = require("async");
let WimtService = require("../../../lib/wimt/service");

module.exports = function (Trip) {

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

                journey.itineraries.forEach(function(itinerary) {
                    if (!itinerary.legs) {
                        return;
                    }

                    itinerary.legs.forEach(function(leg) {
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

}