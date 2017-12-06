require('source-map-support').install();
const {create, printErrors} = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = create();

init({
    proxy: [{
        target: 'https://www.neomorganics.com',
        // proxiedFileOptions: {
            // matchFile: true,
            // baseDirectory: 'fixtures'
        // }
    }],
    strict: true,
    server: {port: 9001}
})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors));
        }
        console.log(output.server.address());
    });
