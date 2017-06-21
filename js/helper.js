/********************
 * Helper functions *
 ********************/


/**
 * Clears the properties table and readds editable rows for every property of the selected entity.
 **/
var debounceTimeout = null;
function updatePropertiesTable() {
  //remove all rows
  while (Editor.propertiesTable.lastElementChild !== null) {
    Editor.propertiesTable.lastElementChild.querySelectorAll("input")[0].removeEventListener("change", Hooks.onPropertyFieldChange);
    Editor.propertiesTable.removeChild(Editor.propertiesTable.lastElementChild);
  }

  if (Editor.selected === false) return;

  //add all properties except for functions and hidden properties (begins with __)
  for (var key in Editor.selected) {
    if (typeof Editor.selected[key] !== "function" && !key.startsWith("__")) {
      var row = document.createElement("div");
      row.classList.add("table-row");

      var nameCol = document.createElement("div");
      nameCol.classList.add("table-col");
      nameCol.classList.add("prop_common");
      nameCol.textContent = key;
      row.appendChild(nameCol);

      var editorCol = document.createElement("div");
      editorCol.classList.add("table-col");
      
      var editorField = document.createElement("input");
      editorField.value = Editor.selected[key];
      editorCol.appendChild(editorField);

      //add debounce to each editable field that schedule an update of the entity's property 50 ms after 
      //the user types in the box
      editorField.addEventListener("keydown", function(e) {
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
          debounceTimeout = null;
        }

        debounceTimeout = setTimeout(function() {
          Hooks.onPropertyFieldChange(e);
        }, 50); 
      });

      editorField.setAttribute("data-key", key);
      row.appendChild(editorCol);

      Editor.propertiesTable.appendChild(row);
    }
  }
}

/**
 * Unload the contents of the entity's event function string into the editor box
 **/
function updateEventEditor() {
  if (!Editor.selected) {
    Editor.eventEditor.setValue("");
    return;
  }

  Editor.eventEditor.setValue(Editor.selected[Editor.chosenEvent+"String"]);
}


/**
 * Update whether or not each key was pressed last frame
 **/
function updateKeyData() {
  for (var key in Game.Controls.keyData) {
    var data = Game.Controls.keyData[key];
    data.wasPressed = data.pressed;
  }
}

/**
 * Returns true if a point {x, y} is inside (but not on the edge of) a box {x, y, width, height}
 **/
function pointInBox(point, box) {
  return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
}

/**
 * Returns true if two boxes {x, y, width, height} are inside each other, but not simply touching at an edge.
 **/
function boxIntersection(a, b) {
  return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
}

/**
 * Helper function for generateGUID()
 **/
function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}

/**
 * Generate a pseudo GUID randomly (not guaranteed to be unique). Thanks guid.us!
 **/
function generateGUID() {
  return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

/**
 * Take an object that looks like an entity and make a new BaseEntity with all of its properties 
 *   properly applied and copied. 
 * Can be used to duplicate any entity, though not "deep" if any members are reference types.
 **/
function makeRealEntity(ent) {
  var result = new BaseEntity();

  for (key in ent) {
    if (key === "__guid") continue;

    if (key.startsWith("__on") && key.endsWith("String")) {
      //all function strings will be of the form __<FuncName>String
      var memName     = key.substring(0, key.lastIndexOf("String"));
      var func        = new Function("event", ent[key]);
      result[memName] = func;
    }
    
    result[key] = ent[key];
  }

  return result;
}

/**
 * Binds an entity to the timing functions so that "this" can be used within them as expected
 **/
// function configureAsync(ent) {
//   window.setTimeout = (function(entity) { 
//     return function(fn, ms) { 
//       window.oldSetTimeout(function(){ 
//           fn.bind(entity);
//       }, ms);		
//     };
//   }(ent));

//   window.setInterval = (function(entity) { 
//     return function(fn, ms) { 
//       window.oldSetInterval(function(){ 
//           fn.bind(entity);
//       }, ms);		
//     };
//   }(ent));
// }