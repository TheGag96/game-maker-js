declare var require: any;

require.config({
  paths: {
    "knockout": "lib/knockout-3.4.2",
    "vs": "lib/monaco-editor/min/vs"
  }
});

require(["vs/editor/editor.main", "knockout"], ()=>{ 
  require(["./main"], (mainModule)=>{
    mainModule.main(); 
  });
});