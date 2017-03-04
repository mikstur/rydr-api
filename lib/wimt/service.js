'use strict';

let async = require('async');
let request = require('request');

class WIMTService {

    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    static create() {
        return new WIMTService(
            "708b2122-a6f4-4e37-bed5-81274297e089",
            "6SfnTqwWE6zmHmTZ/3KhgYzaqZI5ZzASVL95A7eC220="
        );
    }

    requestAccessToken(cb) {
        request({
            method: "POST",
            headers: "Accept: application/json",
            url: "https://identity.whereismytransport.com/connect/token",
            form: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: "client_credentials",
                scope: "transportapi:all"
            }
        }, function (err, response, body) {
            if (err) return cb(err);

            return cb(null, JSON.parse(body).access_token);
        });
    }

    createJourney(originGeoPoint, destinationGeoPoint, cb) {

        async.waterfall([
            this.requestAccessToken.bind(this),

            function (accessToken, next) {
                request({
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        Authorization: "Bearer " + accessToken
                    },
                    url: "https://platform.whereismytransport.com/api/journeys",
                    json: {
                        geometry: {
                            type: "Multipoint",
                            coordinates: [
                                [originGeoPoint.lng, originGeoPoint.lat],
                                [destinationGeoPoint.lng, destinationGeoPoint.lat]
                            ]
                        },
                        only: {
                            modes: [
                                "LightRail",
                                "Subway",
                                "Bus",
                                "Coach",
                                "ShareTaxi"
                            ]
                        }
                    },
                    maxItineraries: 1
                }, function (err, response, body) {
                    if (err) return next(err);

                    return next(null, body);
                });
            }
        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });

    }

    getJourney(journeyId, cb) {

        async.waterfall([
            this.requestAccessToken.bind(this),

            function (accessToken, next) {
                request({
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: "Bearer " + accessToken
                    },
                    url: "https://platform.whereismytransport.com/api/journeys/" + journeyId
                }, function (err, response, body) {
                    if (err) return next(err);

                    var jsonJourney = null;
                    try {
                        jsonJourney = JSON.parse(body);
                    } catch (e) {
                        jsonJourney = null;
                    }
                    
                    return next(null, jsonJourney);
                });
            }
        ], function (err, result) {
            if (err) return cb(err);

            return cb(null, result);
        });

    }

}

module.exports = WIMTService;