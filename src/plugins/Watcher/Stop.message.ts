import {Observable} from 'rxjs';
import {gracefullyStopChildren} from "../../utils";

export function getStopHandler(context) {
    return function(stream) {
        return stream.flatMap(({respond}) => {
            return gracefullyStopChildren(context)
                .mapTo(respond([null, 'done!']));
        });
    }
}