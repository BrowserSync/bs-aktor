import {Observable} from 'rxjs';
import {Middleware, ServerState} from "./Server";
import {IMethodStream, IActorContext} from "aktor-js";

import {Server} from "http";
import {Server as HttpsServer} from "https";
import {Options} from "../../index";
import {Scheme} from "../../options";
import {PortDetect, PortDetectMessages, portsActorFactory} from "../../ports";

import connect = require('connect');
import http = require('http');
import https = require('https');
import {Sockets, SocketsMessages} from "../Sockets/Sockets";
import {getHttpsOptions} from "./server-utils";
import {SocketsInit} from "../Sockets/Init.message";
const debug = require('debug')('bs:server');

const { of } = Observable;

export namespace ServerInit {
    export type Response = [null|Error[], Server|null]
    export type Input = {
        middleware: Middleware[]
        options: Options
    }
}

export function serverInitHandler(context: IActorContext): any {
    return function(stream: IMethodStream<ServerInit.Input, ServerInit.Response, ServerState>) {

        return stream.flatMap(({payload, respond, state}) => {
            const {options, middleware} = payload;
            const scheme: Scheme = options.get('scheme');

            return getMaybePortActor(context, state.server, options)
                .flatMap(([port, server]) => {
                    // if server is already running?
                    if (server && server.listening) {
                        // check if the port matches the desired + scheme is the same
                        if (server.address().port === port && state.scheme === scheme) {
                            // if so, just re-apply the middleware to avoid rebinding a port
                            return replaceMiddleware(middleware, state.app)
                                .do(x => debug('replacing middleware'))
                                .map((app) => {
                                    return respond([null, server], {server, app, scheme});
                                })
                        }
                    }
                    // at this point, either:
                    //      1) we don't have a server at all
                    //      2) we have a server but the port has changed
                    return closeServer(server)
                    // Now we recreate a new server
                        .flatMap(() => getNewServer(middleware, port, options))
                        // we use that new server to add socket support
                        .flatMap(([server, app]) => {

                            // this is the payload for the Socket actors Init message
                            const socketPayload: SocketsInit.Input = {
                                server,
                                options: options.get('socket').toJS()
                            };

                            // create the sockets actor and send it an Init method
                            return context.actorOf(Sockets, 'sockets')
                                .ask(SocketsMessages.Init, socketPayload)
                                .mapTo([server, app]);
                        })
                        .map(([server, app]) => {
                            return respond([null, server], {server, app, scheme});
                        })
                })
                .catch(err => {
                    return of(respond([[err], null], state));
                });
        });
    }
}


function getMaybePortActor(context, server, options) {
    const optionPort = options.getIn(['server', 'port']);
    if (server) {
        if (server.listening) {
            const serverPort = server.address().port;
            // if the server is already running and
            // listening on the selected port, there's nothing more to do.
            if (serverPort === optionPort) {
                return Observable.of([optionPort, server]);
            }
        }
    }

    const portActor = context.actorOf(portsActorFactory);
    const payload: PortDetect.Input = {
        port: optionPort,
        strict: options.get('strict'),
        name: 'core'
    };

    return portActor
        .ask(PortDetectMessages.Detect, payload)
        .flatMap((resp: PortDetect.Response) => {
            const [errors, port] = resp;
            if (errors && errors.length) {
                return Observable.throw(errors[0]);
            }
            return of([port, server])
        });
}

function createNewServer(options: Options, app): Server|HttpsServer {
    const scheme = options.get('scheme');

    if (scheme === Scheme.http) {
        return http.createServer(app);
    }
    const httpsOptions = getHttpsOptions(options);
    return https.createServer(httpsOptions.toJS(), app);
}

function getNewServer(middleware: Middleware[], port: number, options: Options) {

    const app = connect();

    app.use(function(req, res, next) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
    });

    middleware.forEach((mw: Middleware) => {
        debug(mw);
        app.use(mw.route, mw.handle);
        app.stack[app.stack.length - 1].id = mw.id;
        app.stack[app.stack.length - 1].type = mw.type;
        app.stack[app.stack.length - 1].via = mw.via;
    });

    const server = require('http-shutdown')(createNewServer(options, app));

    // server.listen(port, function() {
    //     console.log('lis cb');
    // });
    return Observable.create(obs => {
        server.listen(port, function() {
            obs.next(true);
            obs.complete();
        });
    }).mapTo([server, app]);
}

function replaceMiddleware(middleware, app) {
    return Observable.create(obs => {
        app.stack = [];
        middleware.forEach(mw => {
            app.use(mw.route, mw.handle);
            app.stack[app.stack.length - 1].id = mw.id;
            app.stack[app.stack.length - 1].type = mw.type;
            app.stack[app.stack.length - 1].via = mw.via;
        });
        obs.next(app);
        obs.complete();
    });
}

function closeServer(server) {
    if (server && server.listening) {
        const closer = Observable.create(obs => {
            server.close(() => {
                obs.next(true);
                obs.complete(true);
            })
        });
        return Observable.merge(closer, Observable.timer(1000)).take(1);
    }
    return Observable.of(true);
}
