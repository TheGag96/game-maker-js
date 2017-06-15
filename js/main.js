////////
// Editor app globals
////////

var Editor = {
  entityList: [],
  dragging: false,
  selected: false,
  lastMouse: null,
  gameRunning: false,
  propertiesTable: null,
  eventEditor: null,
  chosenEvent: null,
  fileDialog: null,

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
  
  Game.canvas            = document.getElementById("field");
  Game.drawContext       = Game.canvas.getContext("2d");
  Editor.propertiesTable = document.getElementById("properties-table");
  Editor.eventEditor     = document.getElementById("event-editor");
  Editor.fileDialog      = document.getElementById("file-dialog");

  ////
  // Set up hooks 
  ////

  Game.canvas.width = Game.canvas.parentElement.clientWidth;
  Game.canvas.height = Game.canvas.parentElement.clientHeight;
  
  Game.canvas.addEventListener("mousedown", Hooks.onCanvasMouseDown, false);
  Game.canvas.addEventListener("mouseup",   Hooks.onCanvasMouseUp, false);
  Game.canvas.addEventListener("mousemove", Hooks.onCanvasMouseMove, false); 
  Game.canvas.addEventListener("keydown",   Hooks.onCanvasKeyDown, false); 
  Game.canvas.addEventListener("keyup",     Hooks.onCanvasKeyUp, false); 

  document.getElementById("play-pause-button").addEventListener("click", Hooks.onPlayPauseButtonClick, false);
  document.getElementById("stop-button").addEventListener(  "click", Hooks.onStopButtonClick, false);
  document.getElementById("add-sprite-button").addEventListener("click", Hooks.onAddSpriteButtonClick, false);
  document.getElementById("remove-sprite-button").addEventListener("click", Hooks.onRemoveSpriteButtonClick, false);
  // document.getElementById("event-editor").addEventListener("change", Hooks.onEventEditorChange, false);
  document.getElementById("event-apply-button").addEventListener("click", Hooks.onEventApplyButtonClick, false);
  document.getElementById("file-new-button").addEventListener("click", Hooks.onFileNewButtonClick, false);
  document.getElementById("file-open-button").addEventListener("click", Hooks.onFileOpenButton, false);
  document.getElementById("file-save-button").addEventListener("click", Hooks.onFileSaveButtonClick, false);
  document.getElementById("file-export-button").addEventListener("click", Hooks.onFileExportButtonClick, false);

  Editor.fileDialog.addEventListener("change", Hooks.onFileDialogClose, false);

  window.addEventListener("resize", Hooks.onWindowResize, false);
  setInterval(Hooks.onUpdateCanvas, 1000/60);
  
  //set up event editor tabs

  var eventTabs = document.getElementById("events-tabs");
  Editor.chosenEvent = eventFuncs[0][0];

  for (var i = 0; i < eventFuncs.length; i++) {
    var newTabBtn = document.createElement("input");
    var newTabLbl = document.createElement("label");

    newTabBtn.name      = "events-tabs";
    newTabBtn.value     = eventFuncs[i][0];
    newTabBtn.id        = "tab-btn" + eventFuncs[i][0];
    newTabBtn.type      = "radio";
    // newTabBtn.classList.add("tab-link");
    if (i == 0) newTabBtn.setAttribute("checked", "");

    newTabLbl.setAttribute("for", newTabBtn.id);
    newTabLbl.innerText = eventFuncs[i][1];
    newTabLbl.addEventListener("click", Hooks.onEventTabClick, false);

    eventTabs.appendChild(newTabBtn);
    eventTabs.appendChild(newTabLbl);
  }

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
// Game object stuff
////////

var Game = {
  canvas: null, drawContext: null,
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
  
  for (var i = 0; i < eventFuncs.length; i++) {
    this[eventFuncs[i][0]+"String"] = "";
  }
};

BaseEntity.prototype.__onUpdate = function(event) {

};

BaseEntity.prototype.__onCollision = function(event) {

};

BaseEntity.prototype.__onGameStart = function(event) {

};

var eventFuncs = [["__onGameStart", "Game Start"], ["__onUpdate", "Every Frame"], ["__onCollision", "On Collision"]];

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
  Game.drawContext.fillStyle = ent.color;
  Game.drawContext.fillRect(ent.x, ent.y, ent.width, ent.height);
};

////////
// Finally, set window Hooks.onload hook
////////

window.addEventListener("load", main, false);