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
  
  Game.canvas.addEventListener("mousedown", Hooks.onCanvasMouseDown);
  Game.canvas.addEventListener("mouseup",   Hooks.onCanvasMouseUp);
  Game.canvas.addEventListener("mousemove", Hooks.onCanvasMouseMove); 
  Game.canvas.addEventListener("keydown",   Hooks.onCanvasKeyDown); 
  Game.canvas.addEventListener("keyup",     Hooks.onCanvasKeyUp); 

  document.getElementById("play-pause-button").addEventListener("click", Hooks.onPlayPauseButtonClick);
  document.getElementById("stop-button").addEventListener("click", Hooks.onStopButtonClick);
  document.getElementById("add-sprite-button").addEventListener("click", Hooks.onAddSpriteButtonClick);
  document.getElementById("remove-sprite-button").addEventListener("click", Hooks.onRemoveSpriteButtonClick);
  // document.getElementById("event-editor").addEventListener("change", Hooks.onEventEditorChange);
  document.getElementById("event-apply-button").addEventListener("click", Hooks.onEventApplyButtonClick);
  document.getElementById("file-new-button").addEventListener("click", Hooks.onFileNewButtonClick);
  document.getElementById("file-open-button").addEventListener("click", Hooks.onFileOpenButton);
  document.getElementById("file-save-button").addEventListener("click", Hooks.onFileSaveButtonClick);
  document.getElementById("file-export-button").addEventListener("click", Hooks.onFileExportButtonClick);

  window.addEventListener("beforeunload", function(event) {
    event.returnValue = "Any unsaved progress will be lost. Are you sure you want to leave?";
    return event.returnValue;
  });

  Editor.fileDialog.addEventListener("change", Hooks.onFileDialogClose);

  window.addEventListener("resize", Hooks.onWindowResize);
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
    newTabLbl.addEventListener("click", Hooks.onEventTabClick);

    eventTabs.appendChild(newTabBtn);
    eventTabs.appendChild(newTabLbl);
  }
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
        return a.priority - b.priority;
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
  priority: 1,
  blockedUp: false, blockedDown: false, blockedLeft: false, blockedRight: false,
  prevX: 0, prevY: 0
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
  var loopVar = [{comp:"x", velComp:"velX", prevComp:"prevX", dirs:["left", "right"]},
                 {comp:"y", velComp:"velY", prevComp:"prevY", dirs:["up", "down"]}];

  for (var i = 0; i < Game.entityList.length; i++) {
    var ent = Game.entityList[i]; 
    ent.blockedUp    = false;
    ent.blockedDown  = false;
    ent.blockedLeft  = false;
    ent.blockedRight = false;
  }

  for (var z = 0; z < loopVar.length; z++) {
    comp     = loopVar[z].comp;
    prevComp = loopVar[z].prevCompvelComp;
    velComp  = loopVar[z].velComp;
    dirs     = loopVar[z].dirs;

    for (var i = 0; i < Game.entityList.length; i++) {
      var ent = Game.entityList[i]; 
      
      ent[prevComp] = ent[comp];
      ent[comp]    += Game.entityList[i][velComp] / 60 * 10;
    }

    for (var a = 0; a < Game.entityList.length; a++) {
      for (var b = a+1; b < Game.entityList.length; b++) {
        var entA = Game.entityList[a], entB = Game.entityList[b];

        if (boxIntersection(entA, entB)) {
          var entAEvent = {
            other: entB,
            direction: dirs[0]
          }

          var entBEvent = {
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

window.addEventListener("load", main);