//written by Michael Rouse

function enableAutocompletion(game) {
  // monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ noLib: true  });
  
  function getType(thing, isMember) {
    isMember =  (isMember == undefined) ? (typeof isMember == "boolean") ? isMember : false : false; 
    
    switch ((typeof thing).toLowerCase() || (thing.__proto__.constructor.name).toLowerCase()) { 
      case "object": 
      return monaco.languages.CompletionItemKind.Class;
      
      case "function": 
      return (isMember) ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Function;
      
      default: 
      return (isMember) ? monaco.languages.CompletionItemKind.Property : monaco.languages.CompletionItemKind.Variable;
    }
  }
  
  // Actual things that enable autocomplete
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', '('],
    
    provideCompletionItems: function(model, position, token) {
      var last_chars = model.getValueInRange({startLineNumber: position.lineNumber, startColumn: 0, endLineNumber: position.lineNumber, endColumn: position.column});
      var words = last_chars.replace(/[\(\)\[\]\{\};\*&\^%\$#@!\-=<>+/]/g, " ").split(" ");
      
      var active_typing = words[words.length - 1]; // What the user is currently typing 
      
      var is_member = active_typing.charAt(active_typing.length - 1) == "."; // True if a member of a function
      
      // Array of autocompletion results
      var result = [];
      
      if (is_member) { 
        // Is a member, get a list of all members, and the prefix
        var parents = active_typing.substring(0, active_typing.length - 1).split("."); 
        var last_token = game[parents[0]]; 
        var prefix = parents[0]; 
        
        // Loop through all the parents the current one will have (to generate prefix)
        for (var i = 1; i < parents.length; i++) { 
          if (last_token.hasOwnProperty(parents[i])) { 
            prefix += '.' + parents[i]; 
            last_token = last_token[parents[i]];
          }
          else { 
            // Not valid
            return [];
          }
        }
        
        // Get all the child properties of the last most parent class
        for (var prop in last_token) { 
          // Do not show properites that begin with "__"
          if (last_token.hasOwnProperty(prop) && !prop.startsWith("__")) { 
            // Add to results array
            var to_push = {
              label: prefix + '.' + prop,
              kind: getType(last_token[prop], true), 
              detail: last_token[prop].__proto__.constructor.name || typeof last_token[prop],     
              insertText: prop
            };
            
            if (to_push.detail.toLowerCase() == 'function') { 
              to_push.insertText   += "(";
              to_push.documentation = (last_token[prop].toString()).split("{")[0];
            }
            
            result.push(to_push);
          }
        }
        
      } else {
        // Root autocomplete
        for (var prop in game) { 
          // Check for similar things that don't begin with "__"
          if (prop.substring(0, active_typing.length) == active_typing && !prop.startsWith("__")) { 
            // Push to result array
            var to_push = { 
              label: prop, 
              kind: getType(game[prop], false),
              detail: game[prop].__proto__.constructor.name || typeof game[prop], 
              insertText: prop
            };
            
            if (to_push.detail.toLowerCase() == 'function') { 
              to_push.insertText   += "(";
              to_push.documentation = (last_token[prop].toString()).split("{")[0];
            }

            result.push(to_push);
          }
        }
      }
      
      return result; 
    }
  });
}