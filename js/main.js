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

  ////
  // Set up hooks 
  ////

  Editor.canvas.width = Editor.canvas.parentElement.clientWidth;
  Editor.canvas.height = Editor.canvas.parentElement.clientHeight;
  
  Editor.canvas.addEventListener("mousedown", onCanvasMouseDown, false);
  Editor.canvas.addEventListener("mouseup", onCanvasMouseUp, false);
  Editor.canvas.addEventListener("mousemove", onCanvasMouseMove, false);

  document.getElementById("play-button").addEventListener("click", onPlayButtonClick, false);
  document.getElementById("pause-button").addEventListener("click", onPauseButtonClick, false);
  document.getElementById("stop-button").addEventListener("click", onStopButtonClick, false);
  document.getElementById("add-sprite-button").addEventListener("click", onAddSpriteButtonClick, false);
  document.getElementById("remove-sprite-button").addEventListener("click", onRemoveSpriteButtonClick, false);

  window.addEventListener("resize", onWindowResize, false);
  
  setInterval(updateCanvas, 1000/60);

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

function updateCanvas() {
  Editor.drawContext.clearRect(0, 0, Editor.canvas.width, Editor.canvas.height);

  if (Editor.gameRunning) {
    if (!Game.paused) {
      for (var i = 0; i < Game.entityList.length; i++) {
        Game.entityList[i].update();
      }

      moveAndCollideEntities();
    }

    for (var i = 0; i < Game.entityList.length; i++) {
      drawEntity(Game.entityList[i]);
    }
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

  mouse = {x: event.pageX, y: event.pageY};

  Editor.selected = false;

  for (var i = Editor.entityList.length-1; i >= 0; i--) {
    if (pointInBox(mouse, Editor.entityList[i])) {
      Editor.dragging = Editor.entityList[i];
      Editor.lastMouse = mouse;
      Editor.selected = Editor.entityList[i];
      break;
    }
  }

  if (Editor.selected) {
    updatePropertiesTable();
  }

  wasClicked = true;
  Editor.lastMouse = mouse;
}

function onCanvasMouseUp(event) {
  Editor.dragging = false;
  wasClicked = false;
}

function onCanvasMouseMove(event) {
  if (Editor.gameRunning) return;
  
  mouse = {x: event.clientX, y: event.clientY};

  if (Editor.dragging) {
    Editor.dragging.x += mouse.x - Editor.lastMouse.x;
    Editor.dragging.y += mouse.y - Editor.lastMouse.y;
  }

  Editor.lastMouse = mouse;
}

function onWindowResize(event) {
  Editor.canvas.width = Editor.canvas.parentElement.clientWidth;
  Editor.canvas.height = Editor.canvas.parentElement.clientHeight;
}

function onPlayButtonClick(event) {
  if (Editor.gameRunning) return;

  Game.entityList = [];
  Game.paused = false;

  for (var i = 0; i < Editor.entityList.length; i++) {
    var ent = Editor.entityList[i];
    var copied = new BaseEntity();

    for (var val in ent) {
      copied[val] = ent[val];
    }

    Game.entityList.push(copied);
  }

  Editor.gameRunning = true;
}

function onPauseButtonClick(event) {
  Game.paused = true;
}

function onStopButtonClick(event) {
  Editor.gameRunning = false;
}

function onAddSpriteButtonClick(event) {
  Editor.entityList.push(new BaseEntity());
}

function onRemoveSpriteButtonClick(event) {

}

////////
// Game object stuff
////////

var Game = {
  entityList: [],
  paused: false,
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
  }
}

var commonProps = {
  name: "",
  x: 0, y: 0,
  width: 25, height: 25,
  velX: 0, velY: 0,
  color: "#000",
  priority: 1
}

var BaseEntity = function() {
  for (var key in commonProps) {
    this[key] = commonProps[key];
  }
};

BaseEntity.prototype.update = function() {

};

BaseEntity.prototype.onCollision = function(dir) {

};

BaseEntity.prototype.onCollision = function(dir) {

};

BaseEntity.prototype.onGameStart = function() {

};

function moveAndCollideEntities() {
  var loopVar = [{comp:"x", velComp:"velX", dirs:["left", "right"]},
                 {comp:"y", velComp:"velY", dirs:["up", "down"]}];

  for (var z = 0; z < loopVar.length; z++) {
    comp    = loopVar[z].comp;
    velComp = loopVar[z].velComp;
    dirs    = loopVar[z].dirs;

    for (var i = 0; i < Game.entityList.length; i++) {
      Game.entityList[comp] += Game.entityList[i][velComp] / 60 * 10;
    }


    for (var a = 0; a < Game.entityList.length; a++) {
      for (var b = a+1; b < Game.entityList.length; b++) {
        var entA = Game.entityList[a], entB = Game.entityList[b];
        if (boxIntersection(entA, entB)) {
          if (entA[velComp] - entB[velComp] < 0) {

          }
          entA.onCollision
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
  // for (var key in commonProps) {
    
  // }

  while (Editor.propertiesTable.hasChildNodes()) {
    Editor.propertiesTable.removeChild(Editor.propertiesTable.lastChild);
  }

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
      row.appendChild(editorCol);

      Editor.propertiesTable.appendChild(row);
    }
  }
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
