define(["require", "exports", "./entity", "./game", "./enums", "./properties", "./keys", "./event"], function (require, exports, entity_1, game_1, enums_1, properties_1, keys_1, event_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ko = require("knockout");
    var EditorViewModel = (function () {
        /****************************************************/
        function EditorViewModel() {
            var _this = this;
            //holds the entities viewable when editing
            this.entityList = [];
            //set to the current entity being dragged, false otherwise
            this.dragging = null;
            //set to the currently selected entity, false otherwise
            this.selected = null;
            //last position of the mouse {x, y}
            this.lastMouse = null;
            //reference to the file dialog element on the page
            this.fileDialog = null;
            this.propertiesViewModel = new properties_1.PropertiesViewModel();
            this.eventViewModel = new event_1.EventViewModel();
            //whether or not the game is paused - used for updating the play/pause button icon
            this.gameRunningState = ko.observable(1);
            this.canvas = document.getElementById("field");
            this.drawContext = this.canvas.getContext("2d");
            this.game = new game_1.GameRunner(this.canvas);
            this.fileDialog = document.getElementById("file-dialog");
            window.Game = this.game;
            window.Direction = enums_1.Direction;
            window.Editor = this;
            window.addEventListener("beforeunload", function (e) { _this.onWindowUnload(e); });
            window.addEventListener("keydown", function (e) { _this.onWindowKeyDown(e); });
            window.addEventListener("resize", function (e) { _this.onWindowResize(e); });
            this.update();
        }
        EditorViewModel.prototype.update = function () {
            var _this = this;
            //clear screen
            this.drawContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
            //draw all entities as well as a translucent box around them
            for (var _i = 0, _a = this.entityList; _i < _a.length; _i++) {
                var ent = _a[_i];
                ent.__draw(this.drawContext);
                this.drawContext.beginPath();
                this.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
                this.drawContext.lineWidth = 2;
                this.drawContext.rect(ent.x - 1, ent.y - 1, ent.width + 2, ent.height + 2);
                this.drawContext.stroke();
            }
            //draw a gold outline around the selected entity on top of everything for visibility
            if (this.selected) {
                this.drawContext.beginPath();
                this.drawContext.strokeStyle = "#FFD700";
                this.drawContext.lineWidth = 2;
                this.drawContext.rect(this.selected.x - 1, this.selected.y - 1, this.selected.width + 2, this.selected.height + 2);
                this.drawContext.stroke();
            }
            if (this.game.isStopped)
                requestAnimationFrame(function () { _this.update(); });
        };
        /**
         * Returns true if a point {x, y} is inside (but not on the edge of) a box {x, y, width, height}
         **/
        EditorViewModel.prototype.pointInBox = function (point, box) {
            return point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height;
        };
        /**
         * Toggles between pausing and playing the game, starting it if it's stopped.
         **/
        EditorViewModel.prototype.togglePlayPauseGame = function () {
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
                var newEntityList = [];
                //copy each entity and push it onto the game object's entity list
                //that way, we can restore the original states before starting the game
                for (var _i = 0, _a = this.entityList; _i < _a.length; _i++) {
                    var ent = _a[_i];
                    newEntityList.push(entity_1.Entity.constructEntity(ent));
                }
                this.game.start(newEntityList);
                this.game.recalcPriority();
                this.gameRunningState(2);
            }
        };
        EditorViewModel.prototype.stopGame = function () {
            this.game.stop();
            this.gameRunningState(1);
        };
        /**
         * Add a new sprite with default properties to the center of the screen.
         **/
        EditorViewModel.prototype.spawnEntity = function () {
            if (!this.game.isStopped())
                return;
            var newOne = new entity_1.Entity();
            newOne.x = this.canvas.width / 2;
            newOne.y = this.canvas.height / 2;
            for (var _i = 0, _a = this.eventViewModel.eventFuncs; _i < _a.length; _i++) {
                var func = _a[_i];
                newOne[func.funcName + "String"] = "";
            }
            this.entityList.push(newOne);
            return newOne;
        };
        EditorViewModel.prototype.deselectEntity = function () {
            this.selected = null;
            this.dragging = null;
        };
        EditorViewModel.prototype.duplicateSelectedEntity = function () {
            if (!this.selected)
                return;
            var newEnt = entity_1.Entity.constructEntity(this.selected);
            this.entityList.push(newEnt);
            return newEnt;
        };
        /**
         * Remove the currently selected sprite.
         **/
        EditorViewModel.prototype.removeSelectedEntity = function () {
            if (!this.selected)
                return;
            this.entityList.splice(this.entityList.indexOf(this.selected), 1);
            this.deselectEntity();
        };
        /**
         * Prompt the user if they really want to delete everything, and then do so
         **/
        EditorViewModel.prototype.newProject = function () {
            if (!this.game.isStopped() || !confirm("Shell will clear everything. Did you save your work?"))
                return;
            this.entityList = [];
            this.selected = null;
            this.propertiesViewModel.selectEntity(null);
            this.eventViewModel.selectEntity(null);
            this.eventViewModel.updateEventEditor();
        };
        /**
         * Show a file dialog for opening up a game project
         **/
        EditorViewModel.prototype.openProject = function () {
            if (!this.game.isStopped())
                return;
            //open file dialog
            this.fileDialog.click();
        };
        /**
         * Download a file describing the game project in the JSON format.
         * Each entity's GUID gets removed, as that stuff shouldn't be saved with the project.
         * Shell means new ones will be created when the project is loaded back up again
         **/
        EditorViewModel.prototype.saveProject = function () {
            var out = { entityList: [] };
            //copy each entity so that we can remove their GUIDs
            for (var i = 0; i < this.entityList.length; i++) {
                var copied = entity_1.Entity.constructEntity(this.entityList[i]);
                delete copied.__guid;
                out.entityList.push(copied);
            }
            var data = new Blob([JSON.stringify(out)], { type: "application/json" });
            //hackily download the file by spoofing a click event to an invisible link
            var virtualLink = document.createElement("a");
            virtualLink.setAttribute("download", "game.json");
            virtualLink.href = URL.createObjectURL(data);
            virtualLink.dispatchEvent(new MouseEvent("click"));
        };
        EditorViewModel.prototype.exportProject = function () {
            //TODO
        };
        /**
         * Called after the dialog opened through the open button closes
         **/
        EditorViewModel.prototype.onFileDialogClose = function (event) {
            var _this = this;
            //alias name for file dialog
            var dialog = this.fileDialog;
            //must have selected one file
            if (dialog.files.length > 0) {
                var reader = new FileReader();
                //set hook for when reader reads
                reader.onload = function () {
                    var data = JSON.parse(reader.result);
                    _this.entityList = [];
                    //for every entity, compile its functions and make sure they're BaseEntities;
                    for (var _i = 0, _a = data.entityList; _i < _a.length; _i++) {
                        var ent = _a[_i];
                        _this.entityList.push(entity_1.Entity.constructEntity(ent));
                    }
                    //reset some editor stuff
                    _this.selected = null;
                    _this.propertiesViewModel.selectEntity(null);
                    _this.eventViewModel.selectEntity(null);
                    _this.eventViewModel.updateEventEditor();
                };
                //read the selected file
                reader.readAsText(dialog.files[0]);
                dialog.value = null;
            }
        };
        /**
         * Handle mouse down events:
         *   - Selecting an entity
         *   - Beginning to drag an entity
         **/
        EditorViewModel.prototype.onCanvasMouseDown = function (event, data) {
            if (!this.game.isStopped())
                return;
            var mouse = { x: event.pageX, y: event.pageY };
            var lastSelected = this.selected;
            this.selected = null;
            //check through every entity and see if we're clicking on it
            for (var i = this.entityList.length - 1; i >= 0; i--) {
                if (this.pointInBox(mouse, this.entityList[i])) {
                    this.dragging = this.entityList[i];
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
        };
        /**
         * If the user releases the mouse, they are no longer dragging an entity
         **/
        EditorViewModel.prototype.onCanvasMouseUp = function (event) {
            if (!this.game.isStopped())
                return;
            this.dragging = null;
        };
        /**
         * At the moment, this hook only handles dragging entities around the canvas.
         **/
        EditorViewModel.prototype.onCanvasMouseMove = function (event) {
            if (!this.game.isStopped())
                return;
            var mouse = { x: event.clientX, y: event.clientY };
            if (this.dragging) {
                this.dragging.x += mouse.x - this.lastMouse.x;
                this.dragging.y += mouse.y - this.lastMouse.y;
                this.propertiesViewModel.updateProperties();
            }
            this.lastMouse = mouse;
        };
        EditorViewModel.prototype.onCanvasKeyDown = function (event) {
            if (this.game.isStopped() && event.which == keys_1.Keys.delete) {
                event.preventDefault();
                this.removeSelectedEntity();
            }
        };
        /**
         * Intercept application-wide keyboard shortcut events
         **/
        EditorViewModel.prototype.onWindowKeyDown = function (event) {
            if (event.which == keys_1.Keys.s && event.ctrlKey) {
                event.preventDefault();
                this.saveProject();
            }
            else if (event.which == keys_1.Keys.o && event.ctrlKey) {
                event.preventDefault();
                this.openProject();
            }
            else if (event.which == keys_1.Keys.d && event.ctrlKey) {
                event.preventDefault();
                this.duplicateSelectedEntity();
            }
        };
        /**
         * Resize the canvas so that it always properly fills the screen space available
         **/
        EditorViewModel.prototype.onWindowResize = function (event) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        };
        /**
         * Confirm the user really wants to leave the page before letting them
         **/
        EditorViewModel.prototype.onWindowUnload = function (event) {
            event.returnValue = "Any unsaved progress will be lost. Are you sure you want to leave?";
            return event.returnValue;
        };
        return EditorViewModel;
    }());
    exports.EditorViewModel = EditorViewModel;
});
