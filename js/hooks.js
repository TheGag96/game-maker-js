////////
// Webpage event hooks
////////

var Hooks = {
  onUpdateCanvas: function() {
    Game.drawContext.clearRect(0, 0, Game.canvas.width, Game.canvas.height);

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
        Game.drawContext.beginPath();
        Game.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
        Game.drawContext.lineWidth = 2;
        Game.drawContext.rect(Editor.entityList[i].x-1, Editor.entityList[i].y-1, Editor.entityList[i].width+2, Editor.entityList[i].height+2);
        Game.drawContext.stroke();
      }

      if (Editor.selected) {
        Game.drawContext.beginPath();
        Game.drawContext.strokeStyle = "#FFD700";
        Game.drawContext.lineWidth = 2;
        Game.drawContext.rect(Editor.selected.x-1, Editor.selected.y-1, Editor.selected.width+2, Editor.selected.height+2);
        Game.drawContext.stroke();
      }
    }
  },

  onCanvasMouseDown: function(event) {
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

    Editor.lastMouse = mouse;
  },

  onCanvasMouseUp: function(event) {
    Editor.dragging = false;
  },

  onCanvasMouseMove: function(event) {
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
  },

  onCanvasKeyDown: function(event) {
    Hooks.handleKeyEvent(event, true);
  },

  onCanvasKeyUp: function(event) {
    Hooks.handleKeyEvent(event, false);
  },

  handleKeyEvent: function(event, isHeldDown) {
    var key = String.fromCharCode(event.which);
    if (!(event.which in Game.Controls.keyData)) {
      Game.Controls.keyData[key] = {pressed: isHeldDown, wasPressed: false};
    }
    else {
      Game.Controls.keyData[key].pressed = isHeldDown;
    }
  },

  onWindowResize: function(event) {
    Game.canvas.width = Game.canvas.parentElement.clientWidth;
    Game.canvas.height = Game.canvas.parentElement.clientHeight;
  },

  onPlayPauseButtonClick: function(event) {
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
  },

  onStopButtonClick: function(event) {
    Editor.gameRunning = false;
    Game.paused = false;
    var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
    playButtonLabelData.remove("fa-pause");
    playButtonLabelData.add("fa-play");
  },

  onAddSpriteButtonClick: function(event) {
    if (Editor.gameRunning) return;
    Editor.entityList.push(new BaseEntity());
  },

  onRemoveSpriteButtonClick: function(event) {
    if (Editor.gameRunning) return;

  },

  onPropertyFieldChange: function(event) {
    var toChange = event.target.getAttribute("data-key");

    if (toChange in commonProps && typeof Editor.selected[toChange] === "number") {
      var casted = +event.target.value;

      if (casted !== NaN) Editor.selected[toChange] = casted;
    }
    else {
      Editor.selected[toChange] = event.target.value;
    }
  },

  onEventListChange: function(event) {
    if (!Editor.selected) return;

    updateEventEditor();
  },

  onEventEditorChange: function(event) {
    try {
      var selectedEvent = eventFuncs[Editor.eventList.selectedIndex];
      var func = new Function("event", Editor.eventEditor.value);
      Editor.selected[selectedEvent] = func;
    }
    catch (e) {  }

    updateEventEditor();
  },

  onEventTabClick: function(event) {
  },

  onFileNewButtonClick: function(event) {
    //msg box: clear everything and start over? yes/no
  },

  onFileOpenButton: function(event) {
    //open file dialog
  },

  onFileSaveButtonClick: function(event) {
    //save file dialog, but only when no file has been saved yet
    var data = JSON.stringify({entityList: Editor.entityList});

  },

  onFileExportButtonClick: function(event) {
    //save file dialog always
  }
};