/***********************
 * Webpage event hooks *
 ***********************/

var Hooks = {
  /**
   * Handles main game loop and drawing. Runs 60 times per second.
   **/
  onUpdateCanvas: function() {
    //clear screen
    Game.drawContext.clearRect(0, 0, Game.canvas.width, Game.canvas.height);

    if (Editor.gameRunning) {
      //run first frame entity code if it's the start
      if (Game.firstFrame) {
        for (var i = 0; i < Game.entityList.length; i++) {
          Game.entityList[i].__onGameStart();
        }
      }

      //if we aren't paused, update, move, and collide all entities
      if (!Game.paused) {
        for (var i = 0; i < Game.entityList.length; i++) {
          var ent = Game.entityList[i];

          if (!ent.__removeFlag) {
            Game.entityList[i].__onUpdate();
          }

          if (ent.__removeFlag) {
            Game.entityList.splice(i, 1);
            i--;
          }
        }

        moveAndCollideEntities();
      }

      //draw them all
      for (var i = 0; i < Game.entityList.length; i++) {
        Game.entityList[i].__draw();
      }

      //update whether or not keys were pressed last frame
      //(allows isHeldOneFrame() to work)
      updateKeyData();

      Game.firstFrame = false;
    }
    else {
      //draw all entities as well as a translucent box around them
      for (var i = 0; i < Editor.entityList.length; i++) {
        Editor.entityList[i].__draw();
        
        Game.drawContext.beginPath();
        Game.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
        Game.drawContext.lineWidth = 2;
        Game.drawContext.rect(Editor.entityList[i].x-1, Editor.entityList[i].y-1, Editor.entityList[i].width+2, Editor.entityList[i].height+2);
        Game.drawContext.stroke();
      }

      //draw a gold outline around the selected entity on top of everything for visibility
      if (Editor.selected) {
        Game.drawContext.beginPath();
        Game.drawContext.strokeStyle = "#FFD700";
        Game.drawContext.lineWidth = 2;
        Game.drawContext.rect(Editor.selected.x-1, Editor.selected.y-1, Editor.selected.width+2, Editor.selected.height+2);
        Game.drawContext.stroke();
      }
    }

    requestAnimationFrame(Hooks.onUpdateCanvas);
  },

  /**
   * Handle mouse down events:
   *   - Selecting an entity
   *   - Beginning to drag an entity
   **/
  onCanvasMouseDown: function(event) {
    if (Editor.gameRunning) return;
    if (event.button != 0)  return; //change if i add right click features

    var mouse = {x: event.pageX, y: event.pageY};

    var alreadySelected   = Editor.selected;
    var selectedSomething = false;

    //check through every entity and see if we're clicking on it
    for (var i = Editor.entityList.length-1; i >= 0; i--) {
      if (pointInBox(mouse, Editor.entityList[i])) {
        Editor.dragging  = Editor.entityList[i];
        Editor.lastMouse = mouse;
        
        alreadySelected = (alreadySelected === Editor.entityList[i]);
        
        selectedSomething = true;

        Editor.selected = Editor.entityList[i];
        break;
      }
    }

    if (!selectedSomething) Editor.selected = false;

    //we don't need to update our UI if the user clicks the same thing we've already selected
    //however, we still do if we selected nothing
    if (alreadySelected === false || Editor.selected === false) {
      updatePropertiesTable();
      updateEventEditor();
    }

    //save last mouse position so that it can be used to detect dragging
    Editor.lastMouse = mouse;
  },

  /**
   * If the user releases the mouse, they are no longer dragging an entity
   **/
  onCanvasMouseUp: function(event) {
    Editor.dragging = false;
  },

  /**
   * At the moment, this hook only handles dragging entities around the canvas.
   **/
  onCanvasMouseMove: function(event) {
    if (Editor.gameRunning) return;
    
    let mouse = {x: event.clientX, y: event.clientY};

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

  /**
   * Handle key down events
   **/
  onCanvasKeyDown: function(event) {
    Hooks.handleKeyEvent(event, true);
    
    if (event.which == Keys.delete) {
      event.preventDefault();
      Hooks.onRemoveSpriteButtonClick(event);
    }
  },

  /**
   * Handle key up events
   **/
  onCanvasKeyUp: function(event) {
    Hooks.handleKeyEvent(event, false);
  },

  /**
   * Function merging the handling of key up and key down events.
   * The engine wraps these such that a user can simply poll whether or not a key was pressed whenever they want.
   **/
  handleKeyEvent: function(event, isHeldDown) {
    if (!(event.which in Game.Controls.keyData)) {
      Game.Controls.keyData[event.which] = {pressed: isHeldDown, wasPressed: false};
    }
    else {
      Game.Controls.keyData[event.which].pressed = isHeldDown;
    }
  },

  /**
   * Resize the canvas so that it always properly fills the screen space available
   **/
  onWindowResize: function(event) {
    Game.canvas.width = Game.canvas.parentElement.clientWidth;
    Game.canvas.height = Game.canvas.parentElement.clientHeight;
  },

  /**
   * Intercept application-wide keyboard shortcut events
   **/
  onWindowKeyDown: function(event) {
    if (event.which == Keys.s && event.ctrlKey) {
      event.preventDefault();
      Hooks.onFileSaveButtonClick(event);
    }
    else if (event.which == Keys.o && event.ctrlKey) {
      event.preventDefault();
      Hooks.onFileOpenButtonClick(event);
    }
    else if (event.which == Keys.d && event.ctrlKey) {
      event.preventDefault();
      Hooks.onDuplicateSpriteButtonClick(event);
    }
  },

  /**
   * When clicked, this button will either:
   *   - Begin the game if it's not running
   *   - Pause the game if it is running
   *   - Unpause the game if it's running and paused
   **/
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

      //copy each entity and push it onto the Game object's entity list
      //this way, we can restore the original states before starting the game
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

  /**
   * Stop the game if it's running.
   * All sprites will appear to snap back to their original states before starting (handled by main game loop).
   **/
  onStopButtonClick: function(event) {
    Editor.gameRunning = false;
    Game.paused = false;
    var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
    playButtonLabelData.remove("fa-pause");
    playButtonLabelData.add("fa-play");
  },

  /**
   * Add a new sprite with default properties to the center of the screen.
   **/
  onAddSpriteButtonClick: function(event) {
    if (Editor.gameRunning) return;
    
    var newOne = new BaseEntity();

    newOne.x = Game.canvas.width/2;
    newOne.y = Game.canvas.height/2;

    Editor.entityList.push(newOne);
  },

  /**
   * Duplciate the currently selected sprite.
   **/
  onDuplicateSpriteButtonClick: function(event) {
    if (!Editor.selected) return;

    var newEnt = makeRealEntity(Editor.selected);

    Editor.entityList.push(newEnt);
  },

  /**
   * Remove the currently selected sprite.
   **/
  onRemoveSpriteButtonClick: function(event) {
    if (Editor.gameRunning || !Editor.selected) return;

    Editor.entityList.splice(Editor.entityList.indexOf(Editor.selected), 1);
    Editor.selected = false;
    Editor.dragging = false;
  },

  /**
   * Updates the currently selected Entity's property changed from the properties table.
   * Called by the debounce function to make the property change almost instantly as the user is typing.
   **/
  onPropertyFieldChange: function(event) {
    var toChange = event.target.getAttribute("data-key");

    if (typeof Editor.selected[toChange] === "number") {
      var toNum = +event.target.value;

      if (toNum !== NaN) Editor.selected[toChange] = toNum;
    }
    else if (typeof Editor.selected[toChange] === "boolean") {
      var toBoolStr = event.target.value.trim().toLowerCase();

      if (toBoolStr == "true" || toBoolStr == "1") {
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

  /**
   * Switches the event editor tabs. 
   **/
  onEventTabClick: function(event) {
    Editor.chosenEvent = event.target.getAttribute("for").substring("tab-btn".length);

    updateEventEditor();
  },

  /**
   * Try to compile a function with the code in the event editor box.
   * If there's a syntax error, a popup will come up and neither the function member or its text member will change.
   **/
  onEventApplyButtonClick: function(event) {
    try {
      var func = new Function("event", Editor.eventEditor.getValue());
      Editor.selected[Editor.chosenEvent] = func;
      Editor.selected[Editor.chosenEvent + "String"] = Editor.eventEditor.getValue();
      updateEventEditor();
    }
    catch (e) {
      alert(e);
    }
  },

  /**
   * Allows pressing tab to insert two spaces into the event editor.
   **/
  onEventEditorKeyDown: function(event) {
    if (event.which == Keys.tab) {
      event.target.insert()
      event.preventDefault();
    }
  },

  /**
   * Prompt the user if they really want to delete everything, and then do so
   **/
  onFileNewButtonClick: function(event) {
    if (Editor.gameRunning || !confirm("This will clear everything. Did you save your work?")) return;

    Editor.entityList = [];
    Editor.selected = false;
    updatePropertiesTable();
    updateEventEditor();
  },

  /**
   * Show a file dialog for opening up a game project
   **/
  onFileOpenButtonClick: function(event) {
    if (Editor.gameRunning) return;
    //open file dialog
    Editor.fileDialog.click(event);
  },

  /**
   * Download a file describing the game project in the JSON format.
   * Each entity's GUID gets removed, as that stuff shouldn't be saved with the project.
   * This means new ones will be created when the project is loaded back up again
   **/
  onFileSaveButtonClick: function(event) {
    var out = {entityList: []};

    //copy each entity so that we can remove their GUIDs
    for (var i = 0; i < Editor.entityList.length; i++) {
      var copied = makeRealEntity(Editor.entityList[i]);
      delete copied.__guid;
      out.entityList.push(copied);
    }

    var data = new Blob([JSON.stringify(out)], { type: "application/json"});

    //hackily download the file by spoofing a click event to an invisible link
    var virtualLink = document.createElement("a");
    virtualLink.setAttribute("download", "game.json");
    virtualLink.href = URL.createObjectURL(data);

    virtualLink.dispatchEvent(new MouseEvent("click"));
  },

  onFileExportButtonClick: function(event) {
    //TODO
  },

  /**
   * Called after the dialog opened through the open button closes
   **/ 
  onFileDialogClose: function(event) {
    //alias name for file dialog
    var dialog = event.target;

    //must have selected one file
    if (dialog.files.length > 0) {
      var reader = new FileReader();

      //set hook for when reader reads
      reader.onload = function() {
        var data = JSON.parse(reader.result);
        Editor.entityList = [];

        //for every entity, compile its functions and make sure they're BaseEntities;
        for (var i = 0; i < data.entityList.length; i++) {
          Editor.entityList.push(makeRealEntity(data.entityList[i]));
        }
        
        //reset some editor stuff
        Editor.selected = false;
        updatePropertiesTable();
        updateEventEditor();
      };

      //read the selected file
      reader.readAsText(dialog.files[0]);
      Editor.fileDialog.value = null;
    }
  }
};