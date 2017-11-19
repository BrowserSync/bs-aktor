import {Observable} from 'rxjs';
import {BsSocketOptions} from "../../options";
import {Server} from "http";
import {initHandler} from "./Init.message";
import {stateHandler} from "./State.message";

export interface SocketsState {
    io: any
    clients: any
}

export enum SocketsMessages {
    Init = 'Detect',
    State = 'State',
}

export function Sockets(address, context) {
    return {
        initialState: {
            io: null,
            clients: null,
        },
        methods: {
            [SocketsMessages.State]: stateHandler,
            [SocketsMessages.Init]: initHandler
        }
    }
}