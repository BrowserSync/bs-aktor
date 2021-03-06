require('source-map-support').install();
const {create, printErrors} = require('../');
const {join} = require('path');

const {bs, init, stop} = create();

init({
    serveStatic: [join(__dirname, '..', 'fixtures')],
    scheme: 'https',
    debug: true
})
    .subscribe(([errors,  output]) => {
        if (errors) {
            return console.log(printErrors(errors))
        }
        console.log(output.server.address());
    });
