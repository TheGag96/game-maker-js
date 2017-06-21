/**********************
 * Editor app globals *
 **********************/

var Editor = {
  //holds the entities viewable when editing
  entityList: [],

  //set to the current entity being dragged, false otherwise
  dragging: null,

  //set to the currently selected entity, false otherwise
  selected: null,

  //last position of the mouse {x, y}
  lastMouse: null,

  //whether or not the game is running
  gameRunning: false,

  //reference to the properties table element on the page
  propertiesTable: null,

  //reference to the event editor element on the page
  eventEditor: null,

  //name of the event function currently being edited 
  chosenEvent: null,

  //reference to the file dialog element on the page
  fileDialog: null,

  /**
   * Adds an entity to the game world and reorders all entities based on their priority property
   **/
  addEntity: function(ent) {
    Editor.entityList.push(ent);
    Editor.recalcPriority();
  },

  /**
   * Sort entityList in ascending order based on their priority property.
   **/
  recalcPriority: function() {
    setTimeout(function() {
      Editor.entityList.sort(function(a, b) {
        return a.priority - b.priority
      });
    }, 0);
  }
};

/*****************
 * Main function *
 *****************/

function main() {
  ////
  // Retrieve/set some globals
  ////
  
  Game.canvas            = document.getElementById("field");
  Game.drawContext       = Game.canvas.getContext("2d");
  Editor.propertiesTable = document.getElementById("properties-table");
  // Editor.eventEditor     = document.getElementById("event-editor");
  Editor.fileDialog      = document.getElementById("file-dialog");

  Game.canvas.width  = Game.canvas.parentElement.clientWidth;
  Game.canvas.height = Game.canvas.parentElement.clientHeight;
  
  Game.drawContext.textBaseline = "top";

  Editor.eventEditor = monaco.editor.create(document.getElementById('event-editor'), {
    value: "",
    language: "javascript",
    fontFamily: "Inconsolata-g",
    lineNumbers: "off",
    fontSize: 13,
  });
  Editor.eventEditor.getModel().updateOptions({tabSize: 2});
  
  showAutocompletion({
    "this": new BaseEntity(),
    "Game": Game
  });

  ////
  // Set up hooks 
  ////
  
  Game.canvas.addEventListener("mousedown", Hooks.onCanvasMouseDown);
  Game.canvas.addEventListener("mouseup",   Hooks.onCanvasMouseUp);
  Game.canvas.addEventListener("mousemove", Hooks.onCanvasMouseMove); 
  Game.canvas.addEventListener("keydown",   Hooks.onCanvasKeyDown); 
  Game.canvas.addEventListener("keyup",     Hooks.onCanvasKeyUp); 

  document.getElementById("play-pause-button").addEventListener("click", Hooks.onPlayPauseButtonClick);
  document.getElementById("stop-button").addEventListener("click", Hooks.onStopButtonClick);
  document.getElementById("add-sprite-button").addEventListener("click", Hooks.onAddSpriteButtonClick);
  document.getElementById("duplicate-sprite-button").addEventListener("click", Hooks.onDuplicateSpriteButtonClick);
  document.getElementById("remove-sprite-button").addEventListener("click", Hooks.onRemoveSpriteButtonClick);
  document.getElementById("event-apply-button").addEventListener("click", Hooks.onEventApplyButtonClick);
  document.getElementById("file-new-button").addEventListener("click", Hooks.onFileNewButtonClick);
  document.getElementById("file-open-button").addEventListener("click", Hooks.onFileOpenButtonClick);
  document.getElementById("file-save-button").addEventListener("click", Hooks.onFileSaveButtonClick);
  document.getElementById("file-export-button").addEventListener("click", Hooks.onFileExportButtonClick);

  //warn users about leaving the page
  window.addEventListener("beforeunload", function(event) {
    event.returnValue = "Any unsaved progress will be lost. Are you sure you want to leave?";
    return event.returnValue;
  });

  Editor.fileDialog.addEventListener("change", Hooks.onFileDialogClose);

  window.addEventListener("resize", Hooks.onWindowResize);
  window.addEventListener("keydown", Hooks.onWindowKeyDown);

  Hooks.onUpdateCanvas();
  
  //set up event editor tabs

  var eventTabs      = document.getElementById("events-tabs");
  Editor.chosenEvent = eventFuncs[0][0];

  for (var i = 0; i < eventFuncs.length; i++) {
    var newTabBtn = document.createElement("input");
    var newTabLbl = document.createElement("label");

    //the actual button of the radio button becomes invisible
    newTabBtn.name      = "events-tabs";
    newTabBtn.value     = eventFuncs[i][0];
    newTabBtn.id        = "tab-btn" + eventFuncs[i][0];
    newTabBtn.type      = "radio";
    // newTabBtn.classList.add("tab-link");
    if (i == 0) newTabBtn.setAttribute("checked", "");

    //the label is the thing that's clickable
    newTabLbl.setAttribute("for", newTabBtn.id);
    newTabLbl.innerText = eventFuncs[i][1];
    newTabLbl.addEventListener("click", Hooks.onEventTabClick);

    eventTabs.appendChild(newTabBtn);
    eventTabs.appendChild(newTabLbl);
  }
}

/*********************
 * Game object stuff *
 *********************/

/****
 * Holds all relevant data about the running game as well as helper functions for the user.
 ****/
var Game = {
  //the canvas used to draw everything on the page as well as its draw context
  canvas: null, drawContext: null,

  //stores all entities in the game world
  entityList: [],

  //whether or not the game is paused
  paused: false,

  //whether or not it's the first frame of the game
  firstFrame: false,

  //will eventually describe the position of the camera to allow scrolling
  // camera: {x:0, y:0},

  /**
   * Adds an entity to the game world and reorders all entities based on their priority property
   **/
  addEntity: function(ent) {
    Game.entityList.push(ent);
    Game.recalcPriority();
  },

  /**
   * Sort entityList in ascending order based on their priority property.
   **/
  recalcPriority: function() {
    setTimeout(function() {
      Game.entityList.sort(function(a, b) {
        return a.priority - b.priority;
      });
    }, 0);
  },

  /**
   * Get an entity in the world by its name in O(n) time.
   **/
  getEntityByName: function(s) {
    for (var i = 0; i < Game.entityList.length; i++) {
      if (Game.entityList[i].name === s) return Game.entityList[i];
    }

    return null;
  },

  /**
   * Holds user functions relating to input.
   **/
  Controls: {
    //populates with data of the form {pressed, wasPressed} as each new key is pressed for the first time
    keyData: { },

    /**
     * Returns whether the player is holding a key.
     * Can take a string describing the key (see keys.js) or the integer keycode.
     **/
    isHeld: function(key) {
      if (typeof key !== "number") key = Keys[key];

      if (!(key in Game.Controls.keyData)) {
        return false;  
      }
      else return Game.Controls.keyData[key].pressed;
    },

    /**
     * Returns whether the player just pressed a key this frame.
     * Can take a string describing the key (see keys.js) or the integer keycode.
     **/
    isHeldOneFrame: function(key) {
      if (typeof key !== "number") key = Keys[key];
      
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

/****
 * The default property settings all entities will be created with
 ***/
var commonProps = {
  //entity name
  name: "",

  //position
  x: 0, y: 0,

  //size
  width: 25, height: 25,
  
  //velocity
  velX: 0, velY: 0,
  
  //how the entity will be drawn ("rectangle", "text", "oval")
  displayType: "rectangle",

  //color the entity will be drawn
  color: "rgba(0, 0, 0, 1)",

  //the text written when displayType == "text"
  text: "",

  //the font string used when displayType == "text"
  font: "12pt Arial",

  //higher means it will be drawn on top of other objects
  priority: 1,

  //whether or not the entity is being blocked by another (should be set manually through collision)
  blockedUp: false, blockedDown: false, blockedLeft: false, blockedRight: false,

  //stores the previous position (note: in __onUpdate(), these will be the same as x and y)
  prevX: 0, prevY: 0,

  //whether or not collision checks are run for this entity
  collides: true,

  //internal flag for removing this entity at/after the next __onUpdate()
  __removeFlag: false,
}

/****
 * Base class for an entity in the game world.
 ****/
var BaseEntity = function() {
  for (var key in commonProps) {
    this[key] = commonProps[key];
  }

  //event functions are also stored as strings containing their code
  for (var i = 0; i < eventFuncs.length; i++) {
    this[eventFuncs[i][0]+"String"] = "";
  }

  this.__guid = generateGUID();
};

/**
 * Runs every frame.
 * Event spec: null
 **/
BaseEntity.prototype.__onGameStart = function(event) { };

/**
 * Runs every frame.
 * Event spec: null
 **/
BaseEntity.prototype.__onUpdate = function(event) { };

/**
 * Runs when the entity collides with another one.
 * Event spec: 
 * {
 *   other:     the entity being collided with
 *   direction: the direction the collision is coming from ("up", "down", "left", "right")
 * }
 **/
BaseEntity.prototype.__onCollision = function(event) { };

/**
 * Draws an entity (currently a rectangle filled with their color property) 
 */
BaseEntity.prototype.__draw = function() {
  Game.drawContext.fillStyle = this.color;
  
  if (this.displayType == "rectangle") {
    Game.drawContext.fillRect(this.x, this.y, this.width, this.height);
  }
  else if (this.displayType == "text") {
    Game.drawContext.font = this.font;
    Game.drawContext.fillText(this.text, this.x, this.y);
  }
  else if (this.displayType == "oval") {
    Game.drawContext.save();
    Game.drawContext.translate(this.x+this.width/2, this.y+this.height/2);
    Game.drawContext.scale(this.width, this.height);
    Game.drawContext.beginPath();
    Game.drawContext.arc(0, 0, 0.5, 0, 2*Math.PI, false);
    Game.drawContext.fill();
    Game.drawContext.restore();
  }
};

/**
 * Sets an entity's remove flag. Will be removed before or after the entity updates next
 **/
BaseEntity.prototype.remove = function() {
  this.__removeFlag = true;
}

/**
 * Returns whether or not an entity is removed from the game world
 **/
BaseEntity.prototype.isRemoved = function() {
  return this.__removeFlag;
}

/**
 * List of all event functions editable by the user as well as their display names.
 **/
var eventFuncs = [["__onGameStart", "Game Start"], ["__onUpdate", "Every Frame"], ["__onCollision", "On Collision"]];

/**
 * Handle the moving and colliding of all entities in the game world.
 *   0) reset all blocked properties to false
 *   1) update all entity x positions based on their velX
 *   2) check all entity collisions in the x direction, triggering their event hooks
 *   3) update all entity y positions based on their velY
 *   4) check all entity collisions in the y direction, triggering their event hooks
 * 
 * Entities with collides=false will not be checked for collision.
 **/
function moveAndCollideEntities() {
  var loopVar = [{comp:"x", velComp:"velX", prevComp:"prevX", sizeComp: "width", dirs:["left", "right"]},
                 {comp:"y", velComp:"velY", prevComp:"prevY", sizeComp: "height", dirs:["up", "down"]}];

  for (var i = 0; i < Game.entityList.length; i++) {
    var ent = Game.entityList[i]; 
    ent.blockedUp    = false;
    ent.blockedDown  = false;
    ent.blockedLeft  = false;
    ent.blockedRight = false;
  }

  //for generality's sake, do x collisions then y collisions by looping
  for (var z = 0; z < loopVar.length; z++) {
    let comp     = loopVar[z].comp;
    let prevComp = loopVar[z].prevComp;
    let velComp  = loopVar[z].velComp;
    let sizeComp = loopVar[z].sizeComp;
    let dirs     = loopVar[z].dirs;

    for (var i = 0; i < Game.entityList.length; i++) {
      var ent = Game.entityList[i]; 
      
      ent[prevComp] = ent[comp];
      ent[comp]    += Game.entityList[i][velComp] / 60 * 10;
    }

    for (var a = 0; a < Game.entityList.length; a++) {
      var entA = Game.entityList[a];
      
      if (!entA.collides) continue;
      
      //set up custom bounding boxes using previous and current positions to account for high entity speeds
      var bboxA = {x: entA.x, y: entA.y, width: entA.width, height: entA.height};

      bboxA[comp]     = Math.min(entA[comp], entA[prevComp]);
      bboxA[sizeComp] = Math.abs(entA[prevComp]-entA[comp]) + entA[sizeComp];

      for (var b = a+1; b < Game.entityList.length; b++) {
        var entB = Game.entityList[b];

        if (!entB.collides) continue;
        
        var bboxB = {x: entB.x, y: entB.y, width: entB.width, height: entB.height};

        bboxB[comp]     = Math.min(entB[comp], entB[prevComp]);
        bboxB[sizeComp] = Math.abs(entB[prevComp]-entB[comp]) + entB[sizeComp];

        if (boxIntersection(bboxA, bboxB)) {
          var entAEvent = {
            other: entB,
            direction: dirs[0]
          }

          var entBEvent = {
            other: entA,
            direction: dirs[1]
          }

          //switch direction of collision based on velocity difference
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

/*****************************************
 * Finally, set window Hooks.onload hook *
 *****************************************/

// window.addEventListener("load", main);