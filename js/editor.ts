import {Entity}              from "./entity";
import {GameRunner}          from "./game";
import {showAutocompletion}  from "./completions";
import {Direction}           from "./enums";
import {PropertiesViewModel} from "./properties";
import {Keys}                from "./keys";
import {EventViewModel}      from "./event";
let ko = require("knockout");


export class EditorViewModel {
  //holds the entities viewable when editing
  entityList: IBaseEntity[] = [];

  //set to the current entity being dragged, false otherwise
  dragging: IBaseEntity = null;

  //set to the currently selected entity, false otherwise
  selected: IBaseEntity = null;

  //last position of the mouse {x, y}
  lastMouse = null;

  //reference to canvas being drawn to
  canvas: HTMLCanvasElement;
  private drawContext: CanvasRenderingContext2D;

  //instance to the actual game that runs
  game: GameRunner;  

  //reference to the file dialog element on the page
  fileDialog: HTMLInputElement = null;

  propertiesViewModel = new PropertiesViewModel();
  eventViewModel      = new EventViewModel();

  //whether or not the game is paused - used for updating the play/pause button icon
  gameRunningState = ko.observable(1);

  /****************************************************/

  constructor() {
    this.canvas      = document.getElementById("field") as HTMLCanvasElement;
    this.drawContext = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.game        = new GameRunner(this.canvas);
    this.fileDialog  = document.getElementById("file-dialog") as HTMLInputElement;

    (window as any).Game      = this.game;
    (window as any).Direction = Direction;
    (window as any).Editor    = this;

    window.addEventListener("beforeunload", (e) => {this.onWindowUnload(e)}  );
    window.addEventListener("keydown",      (e) => {this.onWindowKeyDown(e)} );
    window.addEventListener("resize",       (e) => {this.onWindowResize(e)}  );

    this.update();
  }

  update() {
    //clear screen
    this.drawContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //draw all entities as well as a translucent box around them
    for (let ent of this.entityList) {
      ent.__draw(this.drawContext);
      
      this.drawContext.beginPath();
      this.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
      this.drawContext.lineWidth = 2;
      this.drawContext.rect(ent.x-1, ent.y-1, ent.width+2, ent.height+2);
      this.drawContext.stroke();
    }

    //draw a gold outline around the selected entity on top of everything for visibility
    if (this.selected) {
      this.drawContext.beginPath();
      this.drawContext.strokeStyle = "#FFD700";
      this.drawContext.lineWidth = 2;
      this.drawContext.rect(this.selected.x-1, this.selected.y-1, this.selected.width+2, this.selected.height+2);
      this.drawContext.stroke();
    }

    if (this.game.isStopped) requestAnimationFrame(() => {this.update()});
  }

  /**
   * Returns true if a point {x, y} is inside (but not on the edge of) a box {x, y, width, height}
   **/
  pointInBox(point, box) {
    return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
  }

  /**
   * Toggles between pausing and playing the game, starting it if it's stopped. 
   **/
  togglePlayPauseGame() {
    if (this.game.isRunning()) {
      this.game.pause();
      this.gameRunningState(3);
    }
    else if (this.game.isPaused()) {
      this.game.unpause();
      this.gameRunningState(2);
    }
    else {
      this.game.firstFrame = true;
      let newEntityList = [];

      //copy each entity and push it onto the game object's entity list
      //that way, we can restore the original states before starting the game
      for (let ent of this.entityList) {
        newEntityList.push(Entity.constructEntity(ent));
      }

      this.game.start(newEntityList);
      this.game.recalcPriority();

      this.gameRunningState(2);
    }
  }

  stopGame() {
    this.game.stop();
    this.gameRunningState(1);
  }

  /**
   * Add a new sprite with default properties to the center of the screen.
   **/
  spawnEntity(): Entity {
    if (!this.game.isStopped()) return;
    
    var newOne = new Entity();

    newOne.x = this.canvas.width/2;
    newOne.y = this.canvas.height/2;

    for (let func of this.eventViewModel.eventFuncs) {
      newOne[func.funcName+"String"] = "";
    }

    this.entityList.push(newOne);
    return newOne;
  }

  deselectEntity() {
    this.selected = null;
    this.dragging = null;
  }

  duplicateSelectedEntity(): Entity {
    if (!this.selected) return;

    var newEnt = Entity.constructEntity(this.selected);
    this.entityList.push(newEnt);

    return newEnt;
  }

  /**
   * Remove the currently selected sprite.
   **/
  removeSelectedEntity() {
    if (!this.selected) return;

    this.entityList.splice(this.entityList.indexOf(this.selected), 1);
    this.deselectEntity();
  }

  /**
   * Prompt the user if they really want to delete everything, and then do so
   **/
  newProject() {
    if (!this.game.isStopped() || !confirm("Shell will clear everything. Did you save your work?")) return;

    this.entityList = [];
    this.selected = null;
    this.propertiesViewModel.selectEntity(null);
    this.eventViewModel.selectEntity(null);
    this.eventViewModel.updateEventEditor();
  }

  /**
   * Show a file dialog for opening up a game project
   **/
  openProject() {
    if (!this.game.isStopped()) return;
    //open file dialog
    this.fileDialog.click();
  }

  /**
   * Download a file describing the game project in the JSON format.
   * Each entity's GUID gets removed, as that stuff shouldn't be saved with the project.
   * Shell means new ones will be created when the project is loaded back up again
   **/
  saveProject() {
    var out = {entityList: []};

    //copy each entity so that we can remove their GUIDs
    for (var i = 0; i < this.entityList.length; i++) {
      var copied = Entity.constructEntity(this.entityList[i]);
      delete copied.__guid;
      out.entityList.push(copied);
    }

    var data = new Blob([JSON.stringify(out)], { type: "application/json"});

    //hackily download the file by spoofing a click event to an invisible link
    var virtualLink = document.createElement("a");
    virtualLink.setAttribute("download", "game.json");
    virtualLink.href = URL.createObjectURL(data);

    virtualLink.dispatchEvent(new MouseEvent("click"));
  }

  exportProject() {
    //TODO
  }

  /**
   * Called after the dialog opened through the open button closes
   **/ 
  onFileDialogClose(event) {
    //alias name for file dialog
    var dialog = this.fileDialog;  

    //must have selected one file
    if (dialog.files.length > 0) {
      var reader = new FileReader();

      //set hook for when reader reads
      reader.onload = () => {
        var data = JSON.parse(reader.result);
        this.entityList = [];

        //for every entity, compile its functions and make sure they're BaseEntities;
        for (let ent of data.entityList) {
          this.entityList.push(Entity.constructEntity(ent));
        }
        
        //reset some editor stuff
        this.selected = null;
        this.propertiesViewModel.selectEntity(null);
        this.eventViewModel.selectEntity(null);
        this.eventViewModel.updateEventEditor();
      };

      //read the selected file
      reader.readAsText(dialog.files[0]);
      dialog.value = null;
    }
  }

  /**
   * Handle mouse down events:
   *   - Selecting an entity
   *   - Beginning to drag an entity
   **/
  onCanvasMouseDown(event, data) {
    if (!this.game.isStopped()) return;

    var mouse = {x: event.pageX, y: event.pageY};

    let lastSelected = this.selected;
    this.selected    = null;

    //check through every entity and see if we're clicking on it
    for (var i = this.entityList.length-1; i >= 0; i--) {
      if (this.pointInBox(mouse, this.entityList[i])) {
        this.dragging  = this.entityList[i];
        this.lastMouse = mouse;

        this.selected = this.entityList[i];
        break;
      }
    }

    if (lastSelected != this.selected) {
      this.eventViewModel.selectEntity(this.selected);
      this.propertiesViewModel.selectEntity(this.selected);
      this.eventViewModel.updateEventEditor();
    }

    //save last mouse position so that it can be used to detect dragging
    this.lastMouse = mouse;
  }

  /**
   * If the user releases the mouse, they are no longer dragging an entity
   **/
  onCanvasMouseUp(event) {
    if (!this.game.isStopped()) return;
    this.dragging = null;
  }

  /**
   * At the moment, this hook only handles dragging entities around the canvas.
   **/
  onCanvasMouseMove(event) {
    if (!this.game.isStopped()) return;

    let mouse = {x: event.clientX, y: event.clientY};

    if (this.dragging) {
      this.dragging.x += mouse.x - this.lastMouse.x;
      this.dragging.y += mouse.y - this.lastMouse.y;  

      this.propertiesViewModel.updateProperties();
    }

    this.lastMouse = mouse;
  }

  onCanvasKeyDown(event) {
    if (this.game.isStopped() && event.which == Keys.delete) {
      event.preventDefault();
      this.removeSelectedEntity();
    }
  }

  /**
   * Intercept application-wide keyboard shortcut events
   **/
  onWindowKeyDown(event) {
    if (event.which == Keys.s && event.ctrlKey) {
      event.preventDefault();
      this.saveProject();
    }
    else if (event.which == Keys.o && event.ctrlKey) {
      event.preventDefault();
      this.openProject();
    }
    else if (event.which == Keys.d && event.ctrlKey) {
      event.preventDefault();
      this.duplicateSelectedEntity();
    }
  }

  /**
   * Resize the canvas so that it always properly fills the screen space available
   **/
  onWindowResize(event) {
    this.canvas.width  = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  /**
   * Confirm the user really wants to leave the page before letting them
   **/
  onWindowUnload(event) {
    event.returnValue = "Any unsaved progress will be lost. Are you sure you want to leave?";
    return event.returnValue;
  }
}
