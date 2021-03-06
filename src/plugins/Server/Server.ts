import {Observable} from 'rxjs';
import {Server} from "http";
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {Map} from "immutable";
import {Scheme} from "../../options";
import {serverAddressHandler} from "./Address.message";
import {serverInitHandler} from "./Init.message";
import {stopHandler} from "./Stop.message";
import {listeningHandler} from "./Listening.message";
import {addMiddlewareHandler} from "./AddMiddleware.message";

const debug = require('debug')('bs:server');

export interface MiddlewareResponse {
    mw?: Middleware[],
    options?: Map<string, any>,
}

export enum MiddlewareTypes {
    proxy = 'proxy',
    serveStatic = 'serveStatic',
    clientJs = 'clientJs',
    rewriteRules = 'rewriteRules',
    other = 'other',
}

export interface Middleware {
    id?: string,
    via?: string,
    route: string,
    handle: Function,
    type: MiddlewareTypes,
}

export interface ServerState { 
    server: any,
    app: any,
    scheme: Scheme,
}

export enum ServerMessages {
    Init = 'Detect',
    Listening = 'Listening',
    AddMiddleware = 'AddMiddleware',
    Stop = 'stop',
    Address = 'Address',
}

export function BrowserSyncServer(address: string, context: IActorContext): any {
    return {
        postStart() {
            debug('-> postStart()');
        },
        initialState: {server: null, app: null},
        methods: {
            [ServerMessages.Address]: serverAddressHandler,
            [ServerMessages.Init]: serverInitHandler(context),
            [ServerMessages.AddMiddleware]: addMiddlewareHandler,
            [ServerMessages.Stop]: stopHandler,
            [ServerMessages.Listening]: listeningHandler,
        },
    }
}

