require.config({
    paths: {
        "knockout": "lib/knockout-3.4.2",
        "vs": "lib/monaco-editor/min/vs"
    }
});
require(["vs/editor/editor.main", "knockout"], function () {
    require(["./main"], function (mainModule) {
        mainModule.main();
    });
});
