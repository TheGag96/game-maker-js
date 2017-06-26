declare var require: any;
require.config({
  paths: {
    "knockout": "lib/knockout-3.4.2.js",
    "vs": "lib/monaco-editor/min/vs"
  }
});
require(["vs/editor/editor.main", "knockout"], function() { 
  require(["./main"], (mainModule)=>{
    mainModule.main(); 
  });
});