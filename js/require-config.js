require.config({
    paths: {
        "knockout": "lib/knockout-3.4.2.js",
        "vs": "lib/monaco-editor/min/vs"
    }
});
require(['vs/editor/editor.main'], function () {
    require(['./main'], function (mainModule) {
        mainModule.main();
    });
});
