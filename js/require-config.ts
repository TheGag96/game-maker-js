declare var require: any;

require.config({
  paths: {
    "knockout": "lib/knockout-3.4.2",
    "vs": "lib/monaco-editor/min/vs"
  }
});

require(["vs/editor/editor.main", "knockout"], (m, ko)=>{ 
  require(["./editor"], (editorModule)=>{
    ko.bindingHandlers.boundEvent = {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        function generateEvent(a) {
          element.addEventListener(a, (e) => {
            valueAccessor()[a].call(bindingContext["$parent"] || bindingContext["$root"], e, bindingContext["$data"]);
          });
        }

        for (var event in valueAccessor()) { 
          generateEvent(event);
        }
      },
      
  };
 
    ko.applyBindings(new editorModule.EditorViewModel());
  });
});