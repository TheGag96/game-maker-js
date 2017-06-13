////////
// Editor app globals
////////

var Editor = {
  canvas: null, drawContext: null,
  entityList: [],
  dragging: false,
  selected: false,
  lastMouse: null,
  gameRunning: false,
  propertiesTable: null,
  eventList: null, eventEditor: null,

  addEntity: function(ent) {
    Editor.entityList.push(ent);
    Editor.recalcPriority();
  },

  recalcPriority: function() {
    setTimeout(function() {
      Editor.entityList.sort(function(a, b) {
        return a.priority - b.priority
      });
    }, 0);
  }
};

////////
// Main function
////////

function main() {
  ////
  // Retrieve/set some globals
  ////
  
  Editor.canvas          = document.getElementById("field");
  Editor.drawContext     = Editor.canvas.getContext("2d");
  Editor.propertiesTable = document.getElementById("properties-table");
  Editor.eventList       = document.getElementById("event-list");
  Editor.eventEditor     = document.getElementById("event-editor");

  ////
  // Set up hooks 
  ////

  Editor.canvas.width = Editor.canvas.parentElement.clientWidth;
  Editor.canvas.height = Editor.canvas.parentElement.clientHeight;
  
  Editor.canvas.addEventListener("mousedown", onCanvasMouseDown, false);
  Editor.canvas.addEventListener("mouseup", onCanvasMouseUp, false);
  Editor.canvas.addEventListener("mousemove", onCanvasMouseMove, false); 
  Editor.canvas.addEventListener("keydown", onCanvasKeyDown, false); 
  Editor.canvas.addEventListener("keyup", onCanvasKeyUp, false); 

  document.getElementById("play-pause-button").addEventListener("click", onPlayPauseButtonClick, false);
  document.getElementById("stop-button").addEventListener("click", onStopButtonClick, false);
  document.getElementById("add-sprite-button").addEventListener("click", onAddSpriteButtonClick, false);
  document.getElementById("remove-sprite-button").addEventListener("click", onRemoveSpriteButtonClick, false);
  document.getElementById("event-list").addEventListener("change", onEventListChange, false);
  document.getElementById("event-editor").addEventListener("change", onEventEditorChange, false);

  window.addEventListener("resize", onWindowResize, false);
  
  setInterval(onUpdateCanvas, 1000/60);


  //test stuff

  var someBox = new BaseEntity();
  someBox.x = 5;
  someBox.y = 2;
  someBox.width = 200;
  someBox.height = 100;
  someBox.color = "rgba(255, 0, 0, 1)";
  someBox.priority = 10;

  var anotherbox = new BaseEntity();
  anotherbox.x = 100;
  anotherbox.y = 2;
  anotherbox.width = 200;
  anotherbox.height = 100;
  anotherbox.color = "rgba(0, 0, 255, 1)";

  Editor.addEntity(someBox);
  Editor.addEntity(anotherbox);
}

////////
// Webpage event hooks
////////

function onUpdateCanvas() {
  Editor.drawContext.clearRect(0, 0, Editor.canvas.width, Editor.canvas.height);

  if (Editor.gameRunning) {
    if (Game.firstFrame) {
      for (var i = 0; i < Game.entityList.length; i++) {
        Game.entityList[i].__onGameStart();
      }
    }

    if (!Game.paused) {
      for (var i = 0; i < Game.entityList.length; i++) {
        Game.entityList[i].__onUpdate();
      }

      moveAndCollideEntities();
    }

    for (var i = 0; i < Game.entityList.length; i++) {
      drawEntity(Game.entityList[i]);
    }

    updateKeyData();

    Game.firstFrame = false;
  }
  else {
    for (var i = 0; i < Editor.entityList.length; i++) {
      drawEntity(Editor.entityList[i]);
    }

    if (Editor.selected) {
      Editor.drawContext.beginPath();
      Editor.drawContext.strokeStyle = "#FFD700";
      Editor.drawContext.lineWidth = 2;
      Editor.drawContext.rect(Editor.selected.x-2, Editor.selected.y-2, Editor.selected.width+4, Editor.selected.height+4);
      Editor.drawContext.stroke();
    }
  }
}

var wasClicked = false;

function onCanvasMouseDown(event) {
  if (Editor.gameRunning) return;
  if (event.button != 0) return; //change if i add right click features

  mouse = {x: event.pageX, y: event.pageY};

  var alreadySelected   = Editor.selected;
  var selectedSomething = false;

  for (var i = Editor.entityList.length-1; i >= 0; i--) {
    if (pointInBox(mouse, Editor.entityList[i])) {
      Editor.dragging  = Editor.entityList[i];
      Editor.lastMouse = mouse;

      if (alreadySelected === Editor.entityList[i]) alreadySelected = true;
      else                                          alreadySelected = false;
      
      selectedSomething = true;

      Editor.selected = Editor.entityList[i];
      break;
    }
  }

  if (!selectedSomething) Editor.selected = false;

  if (alreadySelected === false || Editor.selected === false) {
    updatePropertiesTable();
    updateEventEditor();
  }

  wasClicked = true;
  Editor.lastMouse = mouse;
}

function onCanvasMouseUp(event) {
  Editor.dragging = false;
  wasClicked      = false;
}

function onCanvasMouseMove(event) {
  if (Editor.gameRunning) return;
  
  mouse = {x: event.clientX, y: event.clientY};

  if (Editor.dragging) {
    Editor.dragging.x += mouse.x - Editor.lastMouse.x;
    Editor.dragging.y += mouse.y - Editor.lastMouse.y;

    var rowList = Editor.propertiesTable.childNodes;

    for (var i = 0; i < rowList.length; i++) {
      if (rowList[i].tagName !== undefined && rowList[i].tagName.toLowerCase() === "div") {
        var propName = rowList[i].firstElementChild.innerText;
        if (propName == "x" || propName == "y") {
          rowList[i].lastElementChild.querySelectorAll("input")[0].value = Editor.dragging[propName];
        }
      }
    }
  }

  Editor.lastMouse = mouse;
}

function onCanvasKeyDown(event) {
  handleKeyEvent(event, true);
}

function onCanvasKeyUp(event) {
  handleKeyEvent(event, false);
}

function handleKeyEvent(event, isHeldDown) {
  var key = String.fromCharCode(event.which);
  if (!(event.which in Game.Controls.keyData)) {
    Game.Controls.keyData[key] = {pressed: isHeldDown, wasPressed: false};
  }
  else {
    Game.Controls.keyData[key].pressed = isHeldDown;
  }
}

function onWindowResize(event) {
  Editor.canvas.width = Editor.canvas.parentElement.clientWidth;
  Editor.canvas.height = Editor.canvas.parentElement.clientHeight;
}

function onPlayPauseButtonClick(event) {
  var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
  
  if (Editor.gameRunning) {
    if (Game.paused) {
      Game.paused = false;
      playButtonLabelData.remove("fa-play");
      playButtonLabelData.add("fa-pause");
    }
    else {
      Game.paused = true;
      playButtonLabelData.remove("fa-pause");
      playButtonLabelData.add("fa-play");
    }
  }
  else {
    Game.paused     = false;
    Game.firstFrame = true;
    Game.entityList = [];

    for (var i = 0; i < Editor.entityList.length; i++) {
      var ent = Editor.entityList[i];
      var copied = new BaseEntity();

      for (var val in ent) {
        copied[val] = ent[val];
      }

      Game.entityList.push(copied);
    }

    Game.recalcPriority();

    playButtonLabelData.remove("fa-play");
    playButtonLabelData.add("fa-pause");
    Editor.gameRunning = true;
  }
}

function onStopButtonClick(event) {
  Editor.gameRunning = false;
  Game.paused = false;
  var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
  playButtonLabelData.remove("fa-pause");
  playButtonLabelData.add("fa-play");
}

function onAddSpriteButtonClick(event) {
  if (Editor.gameRunning) return;
  Editor.entityList.push(new BaseEntity());
}

function onRemoveSpriteButtonClick(event) {
  if (Editor.gameRunning) return;

}

function onPropertyFieldChange(event) {
  var toChange = event.target.getAttribute("data-key");

  if (toChange in commonProps && typeof Editor.selected[toChange] === "number") {
    var casted = +event.target.value;

    if (casted !== NaN) Editor.selected[toChange] = casted;
  }
  else {
    Editor.selected[toChange] = event.target.value;
  }
}

function onEventListChange(event) {
  if (!Editor.selected) return;

  updateEventEditor();
}

function onEventEditorChange(event) {
  try {
    var selectedEvent = eventFuncs[Editor.eventList.selectedIndex];
    var func = new Function("event", Editor.eventEditor.value);
    Editor.selected[selectedEvent] = func;
  }
  catch (e) {  }

  updateEventEditor();
}

////////
// Game object stuff
////////

var Game = {
  entityList: [],
  paused: false,
  firstFrame: false,
  camera: {x:0, y:0},

  addEntity: function(ent) {
    Game.entityList.push(ent);
    Game.recalcPriority();
  },

  recalcPriority: function() {
    setTimeout(function() {
      Game.entityList.sort(function(a, b) {
        return a.priority - b.priority
      });
    }, 0);
  },

  Controls: {
    keyData: { },

    isHeld: function(key) {
      key = resolveKeyID(key);
      if (!(key in Game.Controls.keyData)) {
        return false;  
      }
      else return Game.Controls.keyData[key].pressed;
    },

    isHeldOneFrame: function(key) {
      key = resolveKeyID(key);
      if (!(key in Game.Controls.keyData)) {
        return false;  
      }
      else {
        var data = Game.Controls.keyData[key];
        return data.pressed && !data.wasPressed;
      }
    }
  }
}

var commonProps = {
  name: "",
  x: 0, y: 0,
  width: 25, height: 25,
  velX: 0, velY: 0,
  color: "rgba(0, 0, 0, 1)",
  priority: 1
}

var BaseEntity = function() {
  for (var key in commonProps) {
    this[key] = commonProps[key];
  }
};

BaseEntity.prototype.__onUpdate = function(event) {

};

BaseEntity.prototype.__onCollision = function(event) {

};

BaseEntity.prototype.__onGameStart = function(event) {

};

var eventFuncs = { 0: "__onGameStart", 1: "__onUpdate", 2: "__onCollision" };

function moveAndCollideEntities() {
  var loopVar = [{comp:"x", velComp:"velX", dirs:["left", "right"]},
                 {comp:"y", velComp:"velY", dirs:["up", "down"]}];

  for (var z = 0; z < loopVar.length; z++) {
    comp    = loopVar[z].comp;
    velComp = loopVar[z].velComp;
    dirs    = loopVar[z].dirs;

    for (var i = 0; i < Game.entityList.length; i++) {
      Game.entityList[i][comp] += Game.entityList[i][velComp] / 60 * 10;
    }

    for (var a = 0; a < Game.entityList.length; a++) {
      for (var b = a+1; b < Game.entityList.length; b++) {
        var entA = Game.entityList[a], entB = Game.entityList[b];
        if (boxIntersection(entA, entB)) {
          entAEvent = {
            other: entB,
            direction: dirs[0]
          }

          entBEvent = {
            other: entA,
            direction: dirs[1]
          }
          
          if (entA[velComp] - entB[velComp] >= 0) {
            entAEvent.direction = dirs[1];
            entBEvent.direction = dirs[0];
          }

          entA.__onCollision(entAEvent);
          entB.__onCollision(entBEvent);
        }
      }
    }
  }

}

function drawEntity(ent) {
  Editor.drawContext.fillStyle = ent.color;
  Editor.drawContext.fillRect(ent.x, ent.y, ent.width, ent.height);
};

////////
// Helper functions
////////

function updatePropertiesTable() {
  while (Editor.propertiesTable.lastElementChild !== null) {
    Editor.propertiesTable.lastElementChild.querySelectorAll("input")[0].removeEventListener("change", onPropertyFieldChange);
    Editor.propertiesTable.removeChild(Editor.propertiesTable.lastElementChild);
  }

  if (Editor.selected === false) return;

  for (var key in Editor.selected) {
    if (typeof Editor.selected[key] !== "function") {
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
      editorField.addEventListener("change", onPropertyFieldChange);
      editorField.setAttribute("data-key", key);
      row.appendChild(editorCol);

      Editor.propertiesTable.appendChild(row);
    }
  }
}

function updateEventEditor() {
  if (!Editor.selected) {
    Editor.eventEditor.value = "";
    return;
  }

  var selectedEvent = eventFuncs[Editor.eventList.selectedIndex];

  var funcString = ""+Editor.selected[selectedEvent];
  var bodyBegin = funcString.indexOf("{")+2, bodyEnd = funcString.lastIndexOf("}")-1;
  funcString = funcString.substring(bodyBegin, bodyEnd);

  Editor.eventEditor.value = funcString;
}

function updateKeyData() {
  for (var key in Game.Controls.keyData) {
    var data = Game.Controls.keyData[key];
    data.wasPressed = data.pressed;
  }
}

function resolveKeyID(s) {
  if (s == "up")    return "&";
  if (s == "down")  return "(";
  if (s == "left")  return "%";
  if (s == "right") return "'";

  return s.toUpperCase();
}

function pointInBox(point, box) {
  return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
}

function boxIntersection(a, b) {
  return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
}

////////
// Finally, set window onload hook
////////

window.onload = main;
