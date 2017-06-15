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
    if (!(key in Game.Controls.keyData)) {
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
    if (Editor.gameRunning || !Editor.selected) return;

    Editor.entityList.splice(Editor.entityList.indexOf(Editor.selected), 1);
    Editor.selected = false;
    Editor.dragging = false;
  },

  onPropertyFieldChange: function(event) {
    var toChange = event.target.getAttribute("data-key");

    if (typeof Editor.selected[toChange] === "number") {
      var casted = +event.target.value;

      if (casted !== NaN) Editor.selected[toChange] = casted;
    }
    else if (typeof Editor.selected[toChange] === "boolean") {
      var casted = event.target.value.trim().toLowerCase();

      if (casted == "true" || casted == "1") {
        Editor.selected[toChange] = true;
      }
      else {
        Editor.selected[toChange] = false;
      }
    }
    else {
      Editor.selected[toChange] = event.target.value;
    }
  },

  onEventEditorChange: function(event) {
    // try {
    //   var selectedEvent = eventFuncs[Editor.eventList.selectedIndex];
    //   var func = new Function("event", Editor.eventEditor.value);
    //   Editor.selected[selectedEvent] = func;
    // }
    // catch (e) {  }

    // updateEventEditor();
  },

  onEventTabClick: function(event) {
    Editor.chosenEvent = event.target.getAttribute("for").substring("tab-btn".length);

    updateEventEditor();
  },

  onEventApplyButtonClick: function(event) {
    try {
      var func = new Function("event", Editor.eventEditor.value);
      Editor.selected[Editor.chosenEvent] = func;
      Editor.selected[Editor.chosenEvent + "String"] = Editor.eventEditor.value;
      updateEventEditor();
    }
    catch (e) {
      alert(e);
    }
  },

  fileOperation: "",

  onFileNewButtonClick: function(event) {
    //msg box: clear everything and start over? yes/no
  },

  onFileOpenButton: function(event) {
    //open file dialog
    Editor.fileDialog.click(event);
  },

  onFileSaveButtonClick: function(event) {
    var data = new Blob([JSON.stringify({entityList: Editor.entityList})], { type: "application/json"});

    var virtualLink = document.createElement("a");
    virtualLink.setAttribute("download", "game.json");
    virtualLink.href = URL.createObjectURL(data);

    virtualLink.dispatchEvent(new MouseEvent("click"));
  },

  onFileExportButtonClick: function(event) {
    //save file dialog always
  },

  onFileDialogClose: function(event) {
    //alias name for file dialog
    var dialog = event.target;

    //must have selected one file
    if (dialog.files.length > 0) {
      var reader = new FileReader();

      //set hook for when reader reads
      reader.onload = function() {
        var data = JSON.parse(reader.result);

        //for every entity, compile its functions and make sure they're BaseEntities;
        for (var i = 0; i < data.entityList.length; i++) {
          var ent = data.entityList[i];
          ent.__proto__ = BaseEntity.prototype;

          for (key in ent) {
            if (key.startsWith("__")) {
              //all function strings will be of the form __<FuncName>String
              var memName = key.substring(0, key.lastIndexOf("String"));
              var func = new Function("event", ent[key]);
              ent[memName] = func;
            }
          }
        }
        
        Editor.entityList = data.entityList;
      };

      //read the selected file
      reader.readAsText(dialog.files[0]);
    }
  }
};