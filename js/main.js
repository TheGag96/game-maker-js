define(["require", "exports", "./game", "./editor", "./completions", "./keys", "./entity", "./enums"], function (require, exports, game_1, editor_1, completions_1, keys_1, entity_1, enums_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**********************
     * App globals *
     **********************/
    var editor;
    var game;
    var ko = require("knockout");
    /*****************
     * Main function *
     *****************/
    function main() {
        var canvas = document.getElementById("field");
        editor = new editor_1.Editor(canvas);
        game = new game_1.GameRunner(canvas);
        window.Game = game;
        window.Direction = enums_1.Direction;
        window.Editor = editor;
        Shell.init(canvas);
    }
    exports.main = main;
    /**
     * List of all event functions editable by the user as well as their display names.
     **/
    var eventFuncs = [["__onGameStart", "Game Start"], ["__onUpdate", "Every Frame"], ["__onCollision", "On Collision"]];
    /****************************
     * Main Shell handling code *
     ****************************/
    var Shell;
    (function (Shell) {
        //reference to canvas being drawn to
        var canvas;
        //reference to the properties table element on the page
        var propertiesTable = null;
        //reference to the event Shell element on the page
        var eventEditor = null;
        //name of the event function currently being edited 
        var chosenEvent = "__onGameStart";
        //reference to the file dialog element on the page
        var fileDialog = null;
        var propertiesViewModel = new PropertiesViewModel();
        function PropertiesViewModel() {
            var self = this;
            self.selected = {};
            self.props = ko.observableArray([]);
            self.selectEntity = function (ent) {
                self.selected = ent;
                var newArr = [];
                for (var key in ent) {
                    if (typeof ent[key] === "function" || key.substring(0, 2) === "__")
                        continue;
                    var newObserve = { name: key, stuff: ko.observable(ent[key]), valid: ko.observable(true) };
                    newArr.push(newObserve);
                    newObserve.stuff.subscribe(function (newVal) {
                        if (!self.setPropWithType(this.name, newVal)) {
                            this.stuff(self.selected[this.name]);
                        }
                    }, newObserve);
                }
                self.props(newArr);
            };
            self.setPropWithType = function (key, value) {
                if (typeof self.selected[key] === "number") {
                    var toNum = +value;
                    if (!isNaN(toNum)) {
                        self.selected[key] = toNum;
                        return true;
                    }
                    return false;
                }
                else if (typeof self.selected[key] === "boolean") {
                    var toBoolStr = value.trim().toLowerCase();
                    self.selected[key] = toBoolStr == "true" || toBoolStr == "1";
                }
                else {
                    self.selected[key] = value;
                }
                return true;
            };
        }
        ;
        /**
         * Constructor for Shell object.
         * Sets many globals and binds event callbacks to itself.
         **/
        function init(canvas) {
            ////
            // Retrieve/set some components
            ////
            canvas = canvas;
            propertiesTable = document.getElementById("properties-table");
            fileDialog = document.getElementById("file-dialog");
            eventEditor = window["monaco"].editor.create(document.getElementById('event-editor'), {
                value: "",
                language: "javascript",
                fontFamily: "Inconsolata-g",
                lineNumbers: "off",
                fontSize: 13,
            });
            eventEditor.getModel().updateOptions({ tabSize: 2 });
            completions_1.showAutocompletion({
                "Shell": new entity_1.Entity(),
                "Game": game,
                "Direction": { up: 0, down: 1, left: 2, right: 3 }
            });
            ////
            // Set up Shell event callbacks
            ////
            canvas.addEventListener("mousedown", onCanvasMouseDown);
            canvas.addEventListener("mouseup", onCanvasMouseUp);
            canvas.addEventListener("mousemove", onCanvasMouseMove);
            canvas.addEventListener("keydown", onCanvasKeyDown);
            canvas.addEventListener("keyup", onCanvasKeyUp);
            fileDialog.addEventListener("change", onFileDialogClose);
            function addEventToElement(name, event, callback) {
                document.getElementById(name).addEventListener(event, callback);
            }
            addEventToElement("play-pause-button", "click", onPlayPauseButtonClick);
            addEventToElement("stop-button", "click", onStopButtonClick);
            addEventToElement("add-sprite-button", "click", onAddSpriteButtonClick);
            addEventToElement("duplicate-sprite-button", "click", onDuplicateSpriteButtonClick);
            addEventToElement("remove-sprite-button", "click", onRemoveSpriteButtonClick);
            addEventToElement("event-apply-button", "click", onEventApplyButtonClick);
            addEventToElement("file-new-button", "click", onFileNewButtonClick);
            addEventToElement("file-open-button", "click", onFileOpenButtonClick);
            addEventToElement("file-save-button", "click", onFileSaveButtonClick);
            addEventToElement("file-export-button", "click", onFileExportButtonClick);
            //warn users about leaving the page
            window.addEventListener("beforeunload", function (event) {
                event.returnValue = "Any unsaved progress will be lost. Are you sure you want to leave?";
                return event.returnValue;
            });
            window.addEventListener("resize", onWindowResize);
            window.addEventListener("keydown", onWindowKeyDown);
            //set up event editor tabs
            var eventTabs = document.getElementById("events-tabs");
            chosenEvent = eventFuncs[0][0];
            for (var i = 0; i < eventFuncs.length; i++) {
                var newTabBtn = document.createElement("input");
                var newTabLbl = document.createElement("label");
                //the actual button of the radio button becomes invisible
                newTabBtn.name = "events-tabs";
                newTabBtn.value = eventFuncs[i][0];
                newTabBtn.id = "tab-btn" + eventFuncs[i][0];
                newTabBtn.type = "radio";
                if (i == 0)
                    newTabBtn.setAttribute("checked", "");
                //the label is the thing that's clickable
                newTabLbl.setAttribute("for", newTabBtn.id);
                newTabLbl.innerText = eventFuncs[i][1];
                newTabLbl.addEventListener("click", onEventTabClick);
                eventTabs.appendChild(newTabBtn);
                eventTabs.appendChild(newTabLbl);
            }
            ko.applyBindings(propertiesViewModel);
            //we're ready to go!
            requestAnimationFrame(onCanvasUpdate);
        }
        Shell.init = init;
        /**
         * Handles main game loop and drawing. Runs 60 times per second.
         **/
        function onCanvasUpdate() {
            //clear screen
            game.drawContext.clearRect(0, 0, game.canvas.width, game.canvas.height);
            if (game.isRunning())
                game.step();
            else
                editor.step();
            if (game.isStopped())
                onStopButtonClick(null);
            // console.log("wut");
            requestAnimationFrame(onCanvasUpdate);
        }
        /**
         * Handle mouse down events on canvas (delegates to editor)
         **/
        function onCanvasMouseDown(event) {
            if (game.isRunning())
                return;
            if (event.button != 0)
                return; //change if i add right click features
            var lastSelected = editor.selected;
            editor.onMouseDown(event);
            //we don't need to update our Shell if the user clicks the same thing we've already selected
            //however, we still do if we selected nothing
            if (lastSelected != editor.selected) {
                propertiesViewModel.selectEntity(editor.selected);
                updateEventEditor();
            }
        }
        /**
         * Handle mouse up on canvas
         **/
        function onCanvasMouseUp(event) {
            editor.onMouseUp(event);
        }
        /**
         * Handle mouse move on canvas.
         **/
        function onCanvasMouseMove(event) {
            if (game.isRunning())
                return;
            editor.onMouseMove(event);
            if (editor.dragging) {
                var rowList = propertiesTable.childNodes;
                for (var i = 0; i < rowList.length; i++) {
                    var row = rowList[i];
                    if (row.tagName !== undefined && row.tagName.toLowerCase() === "div") {
                        var propName = row.firstElementChild.innerText;
                        if (propName == "x" || propName == "y") {
                            row.lastElementChild.querySelectorAll("input")[0].value = "" + editor.dragging[propName];
                        }
                    }
                }
            }
        }
        /**
         * Handle key down events
         **/
        function onCanvasKeyDown(event) {
            game.controls.handleKeyEvent(event, true);
            if (event.which == keys_1.Keys.delete) {
                event.preventDefault();
                onRemoveSpriteButtonClick(event);
            }
        }
        /**
         * Handle key up events
         **/
        function onCanvasKeyUp(event) {
            game.controls.handleKeyEvent(event, false);
        }
        /**
         * Resize the canvas so that it always properly fills the screen space available
         **/
        function onWindowResize(event) {
            game.canvas.width = game.canvas.parentElement.clientWidth;
            game.canvas.height = game.canvas.parentElement.clientHeight;
        }
        /**
         * Intercept application-wide keyboard shortcut events
         **/
        function onWindowKeyDown(event) {
            if (event.which == keys_1.Keys.s && event.ctrlKey) {
                event.preventDefault();
                onFileSaveButtonClick(event);
            }
            else if (event.which == keys_1.Keys.o && event.ctrlKey) {
                event.preventDefault();
                onFileOpenButtonClick(event);
            }
            else if (event.which == keys_1.Keys.d && event.ctrlKey) {
                event.preventDefault();
                onDuplicateSpriteButtonClick(event);
            }
        }
        /**
         * When clicked, Shell button will either:
         *   - Begin the game if it's not running
         *   - Pause the game if it is running
         *   - Unpause the game if it's running and paused
         **/
        function onPlayPauseButtonClick(event) {
            var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
            if (game.isRunning()) {
                game.pause();
                playButtonLabelData.remove("fa-pause");
                playButtonLabelData.add("fa-play");
            }
            else if (game.isPaused()) {
                game.unpause();
                playButtonLabelData.remove("fa-play");
                playButtonLabelData.add("fa-pause");
            }
            else {
                game.firstFrame = true;
                var newEntityList = [];
                //copy each entity and push it onto the game object's entity list
                //Shell way, we can restore the original states before starting the game
                for (var _i = 0, _a = editor.entityList; _i < _a.length; _i++) {
                    var ent = _a[_i];
                    newEntityList.push(makeRealEntity(ent));
                }
                playButtonLabelData.remove("fa-play");
                playButtonLabelData.add("fa-pause");
                game.start(newEntityList);
                game.recalcPriority();
            }
        }
        /**
         * Stop the game if it's running.
         * All sprites will appear to snap back to their original states before starting (handled by main game loop).
         **/
        function onStopButtonClick(event) {
            game.stop();
            var playButtonLabelData = document.getElementById("play-pause-button").firstElementChild.classList;
            playButtonLabelData.remove("fa-pause");
            playButtonLabelData.add("fa-play");
        }
        /**
         * Add a new sprite with default properties to the center of the screen.
         **/
        function onAddSpriteButtonClick(event) {
            if (game.isRunning())
                return;
            var newOne = new entity_1.Entity();
            newOne.x = game.canvas.width / 2;
            newOne.y = game.canvas.height / 2;
            for (var _i = 0, eventFuncs_1 = eventFuncs; _i < eventFuncs_1.length; _i++) {
                var func = eventFuncs_1[_i];
                newOne[func[0] + "String"] = "";
            }
            editor.entityList.push(newOne);
        }
        /**
         * Duplciate the currently selected sprite.
         **/
        function onDuplicateSpriteButtonClick(event) {
            if (!editor.selected)
                return;
            var newEnt = makeRealEntity(editor.selected);
            editor.entityList.push(newEnt);
        }
        /**
         * Remove the currently selected sprite.
         **/
        function onRemoveSpriteButtonClick(event) {
            if (!game.isStopped() || !editor.selected)
                return;
            editor.entityList.splice(editor.entityList.indexOf(editor.selected), 1);
            editor.selected = null;
            editor.dragging = null;
        }
        /**
         * Updates the currently selected Entity's property changed from the properties table.
         * Called by the debounce function to make the property change almost instantly as the user is typing.
         **/
        function onPropertyFieldChange(event) {
            var toChange = event.target.getAttribute("data-key");
            if (typeof editor.selected[toChange] === "number") {
                var toNum = +event.target.value;
                if (!isNaN(toNum))
                    editor.selected[toChange] = toNum;
            }
            else if (typeof editor.selected[toChange] === "boolean") {
                var toBoolStr = event.target.value.trim().toLowerCase();
                if (toBoolStr == "true" || toBoolStr == "1") {
                    editor.selected[toChange] = true;
                }
                else {
                    editor.selected[toChange] = false;
                }
            }
            else {
                editor.selected[toChange] = event.target.value;
            }
        }
        /**
         * Switches the event editor tabs.
         **/
        function onEventTabClick(event) {
            chosenEvent = event.target.getAttribute("for").substring("tab-btn".length);
            updateEventEditor();
        }
        /**
         * Try to compile a function with the code in the event editor box.
         * If there's a syntax error, a popup will come up and neither the function member or its text member will change.
         **/
        function onEventApplyButtonClick(event) {
            try {
                var func = new Function("event", eventEditor.getValue());
                editor.selected[chosenEvent] = func;
                editor.selected[chosenEvent + "String"] = eventEditor.getValue();
                updateEventEditor();
            }
            catch (e) {
                alert(e);
            }
        }
        /**
         * Prompt the user if they really want to delete everything, and then do so
         **/
        function onFileNewButtonClick(event) {
            if (!game.isStopped() || !confirm("Shell will clear everything. Did you save your work?"))
                return;
            editor.entityList = [];
            editor.selected = null;
            propertiesViewModel.selectEntity(null);
            updateEventEditor();
        }
        /**
         * Show a file dialog for opening up a game project
         **/
        function onFileOpenButtonClick(event) {
            if (!game.isStopped())
                return;
            //open file dialog
            fileDialog.click();
        }
        /**
         * Download a file describing the game project in the JSON format.
         * Each entity's GUID gets removed, as that stuff shouldn't be saved with the project.
         * Shell means new ones will be created when the project is loaded back up again
         **/
        function onFileSaveButtonClick(event) {
            var out = { entityList: [] };
            //copy each entity so that we can remove their GUIDs
            for (var i = 0; i < editor.entityList.length; i++) {
                var copied = makeRealEntity(editor.entityList[i]);
                delete copied.__guid;
                out.entityList.push(copied);
            }
            var data = new Blob([JSON.stringify(out)], { type: "application/json" });
            //hackily download the file by spoofing a click event to an invisible link
            var virtualLink = document.createElement("a");
            virtualLink.setAttribute("download", "game.json");
            virtualLink.href = URL.createObjectURL(data);
            virtualLink.dispatchEvent(new MouseEvent("click"));
        }
        function onFileExportButtonClick(event) {
            //TODO
        }
        /**
         * Called after the dialog opened through the open button closes
         **/
        function onFileDialogClose(event) {
            //alias name for file dialog
            var dialog = event.target;
            //must have selected one file
            if (dialog.files.length > 0) {
                var reader = new FileReader();
                //set hook for when reader reads
                reader.onload = function () {
                    var data = JSON.parse(reader.result);
                    editor.entityList = [];
                    //for every entity, compile its functions and make sure they're BaseEntities;
                    for (var _i = 0, _a = data.entityList; _i < _a.length; _i++) {
                        var ent = _a[_i];
                        editor.entityList.push(makeRealEntity(ent));
                    }
                    //reset some editor stuff
                    editor.selected = null;
                    propertiesViewModel.selectEntity(null);
                    updateEventEditor();
                };
                //read the selected file
                reader.readAsText(dialog.files[0]);
                fileDialog.value = null;
            }
        }
        /**
         * Take an object that looks like an entity and make a new BaseEntity with all of its properties
         *   properly applied and copied.
         * Can be used to duplicate any entity, though not "deep" if any members are reference types.
         **/
        function makeRealEntity(ent) {
            var result = new entity_1.Entity();
            for (var key in ent) {
                if (key === "__guid")
                    continue;
                if (key.substring(0, 4) == "__on" && key.substring(key.length - 6) == "String") {
                    //all function strings will be of the form __<FuncName>String
                    var memName = key.substring(0, key.lastIndexOf("String"));
                    var func = new Function("event", ent[key]);
                    result[memName] = func;
                }
                else
                    result[key] = ent[key];
            }
            return result;
        }
        /**
         * Unload the contents of the entity's event function string into the Shell box
         **/
        function updateEventEditor() {
            if (!editor.selected) {
                eventEditor.setValue("");
                return;
            }
            eventEditor.setValue(editor.selected[chosenEvent + "String"]);
        }
        /**
         * Clears the properties table and readds editable rows for every property of the selected entity.
         **/
        var debounceTimeout = null;
        function updatePropertiesTable() {
            //remove all rows
            while (propertiesTable.lastElementChild !== null) {
                propertiesTable.lastElementChild.querySelectorAll("input")[0] /*.removeEventListener("change", onPropertyFieldChange)*/;
                propertiesTable.removeChild(propertiesTable.lastElementChild);
            }
            if (editor.selected === null)
                return;
            //add all properties except for functions and hidden properties (begins with __)
            for (var key in editor.selected) {
                if (typeof editor.selected[key] !== "function" && key.substring(0, 2) != "__") {
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
                    editorField.value = editor.selected[key];
                    editorCol.appendChild(editorField);
                    //add debounce to each editable field that schedule an update of the entity's property 50 ms after 
                    //the user types in the box
                    editorField.addEventListener("keydown", function (e) {
                        if (debounceTimeout) {
                            clearTimeout(debounceTimeout);
                            debounceTimeout = null;
                        }
                        debounceTimeout = setTimeout(function () {
                            onPropertyFieldChange(e);
                        }, 50);
                    });
                    editorField.setAttribute("data-key", key);
                    row.appendChild(editorCol);
                    propertiesTable.appendChild(row);
                }
            }
        }
    })(Shell || (Shell = {}));
});
