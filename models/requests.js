var pg    = require('pg');
var async = require('async');
var error = require('../routes/errorHandler');

/*
 *  Ajout d'une nouvelle demande dans la base de données
 */
exports.add = function( data, next, callback ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {

        client.query('INSERT INTO public.requests( reference, mail, date, state, token, phone, pushbullet_token, zone, language ) \
                      VALUES( $1, $2, DEFAULT, DEFAULT, $3, $4, $5, $6, $7 )',

            [ data.reference, data.mail, data.token, data.phone,
              data.pushbulletToken, data.zone, data.language ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

            if( result.rowCount == 1 )
                callback( true );
            else
                callback( false );

        });
    });

};

/*
 *  Permet de vérifier l'unicité d'une demande
 */
exports.unique = function( data, next, callback ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {
        client.query("SELECT * FROM public.requests WHERE reference = $1 AND mail = $2 AND state = $3 LIMIT 1",

            [ data.ref, data.mail, 'pending' ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

            if( result.rowCount == 1 )
                callback( false );
            else
                callback( true );

        });
    });

};

/*
 *  Permet de récupérer l'ensemble des demandes en attente ( pending )
 */
exports.getPendingRequests = function( next, callback ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {
        client.query("SELECT r.id, r.reference, r.mail, r.phone, r.token, r.pushbullet_token, r.zone, r.language, s.type, s.name \
                      FROM public.requests r \
                      LEFT JOIN public.servers s ON s.reference = r.reference \
                      WHERE r.state = $1",
            [ 'pending' ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

            callback( result.rows );

        });
    });

};

/*
 *  Permet de récupérer une demande spécifique à partir de son token
 */
exports.getRequestByToken = function( id, token, next, callback ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {
        client.query("SELECT * FROM public.requests WHERE id = $1 AND token = $2 LIMIT 1", [ id, token ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

            if( result.rowCount == 1 )
                callback( result.rows[0] );
            else
                callback( false );

        });
    });

};

/*
 *  Permet de récupérer des statistiques à partir de la base de données
 */
exports.getStatistics = function( next, callback ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {

        async.parallel({

            // Récupération du nombre de demandes en attente
            pendingRequests: function( callback ) {
                client.query("SELECT count(*) as count FROM public.requests WHERE state = 'pending'", function( err, result ) {

                    if( error.handler( err, client, done, next ) ) return;
                    callback(null, result.rows[0].count);

                });
            },

            // Récupération du nombre de demandes terminées
            doneRequests: function(callback){
                client.query("SELECT count(*) as count FROM public.requests WHERE state = 'done'", function( err, result ) {

                    if( error.handler( err, client, done, next ) ) return;
                    callback(null, result.rows[0].count);

                });
            },

            // Récupération des 3 serveurs les plus demandés
            mostRequestedServers: function(callback){
                client.query("SELECT s.name, COUNT('r.reference') AS occurrences \
                              FROM public.requests r \
                              LEFT JOIN public.servers s ON s.reference = r.reference \
                              GROUP BY s.name \
                              ORDER BY occurrences DESC \
                              LIMIT 3", function( err, result ) {

                    if( error.handler( err, client, done, next ) ) return;
                    callback(null, result.rows);

                });
            }

        }, function( err, stats ) {

            done();
            callback( stats );

        });
    });

};

/*
 *  Mise à jour de l'état de la demande ( pending <-> done )
 */
exports.updateState = function( requestState, requestId, next ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {
        client.query('UPDATE public.requests SET state = $1 WHERE id = $2', [ requestState, requestId ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

        });
    });

};

/*
 *  Mise à jour du token de la demande
 */
exports.updateToken = function( token, requestId, next ) {

    pg.connect(process.env.DATABASE_URL, function( err, client, done ) {
        client.query('UPDATE public.requests SET token = $1 WHERE id = $2', [ token, requestId ], function( err, result ) {

            if( error.handler( err, client, done, next ) ) return;
            done();

        });
    });

};
