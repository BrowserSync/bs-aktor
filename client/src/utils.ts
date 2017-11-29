export function each(incoming) {
    return [].slice.call(incoming||[]);
}

export const splitUrl = function(url) {
    let hash, index, params;
    if ((index = url.indexOf('#')) >= 0) {
        hash = url.slice(index);
        url = url.slice(0, index);
    } else {
        hash = '';
    }

    if ((index = url.indexOf('?')) >= 0) {
        params = url.slice(index);
        url = url.slice(0, index);
    } else {
        params = '';
    }

    return { url, params, hash };
};

export const pathFromUrl = function(url) {
    let path;
    ({ url } = splitUrl(url));
    if (url.indexOf('file://') === 0) {
        path = url.replace(new RegExp(`^file://(localhost)?`), '');
    } else {
        //                        http  :   // hostname  :8080  /
        path = url.replace(new RegExp(`^([^:]+:)?//([^:/]+)(:\\d*)?/`), '/');
    }

    // decodeURI has special handling of stuff like semicolons, so use decodeURIComponent
    return decodeURIComponent(path);
};

export const pickBestMatch = function(path, objects, pathFunc): any {
    let score;
    let bestMatch = { score: 0, object: null };

    objects.forEach(object => {
        score = numberOfMatchingSegments(path, pathFunc(object));
        if (score > bestMatch.score) {
            bestMatch = { object, score };
        }
    });

    if (bestMatch.score > 0) {
        return bestMatch;
    } else {
        return null;
    }
};

export const numberOfMatchingSegments = function(path1, path2) {
    // get rid of leading slashes and normalize to lower case
    path1 = path1.replace(/^\/+/, '').toLowerCase();
    path2 = path2.replace(/^\/+/, '').toLowerCase();

    if (path1 === path2) { return 10000; }

    const comps1 = path1.split('/').reverse();
    const comps2 = path2.split('/').reverse();
    const len = Math.min(comps1.length, comps2.length);

    let eqCount = 0;
    while ((eqCount < len) && (comps1[eqCount] === comps2[eqCount])) {
        ++eqCount;
    }

    return eqCount;
};

export const pathsMatch = (path1, path2) => numberOfMatchingSegments(path1, path2) > 0;
