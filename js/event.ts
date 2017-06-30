let ko = require("knockout");

export class EventViewModel {
  eventEditor; 

  selected: IBaseEntity = null;

  // funcBodyText = ko.observable("");
  chosenEvent = ko.observable("");

  eventFuncs = [
    { funcName: "__onGameStart", prettyName: "Game Start"   },
    { funcName: "__onUpdate",    prettyName: "Every Frame"  },
    { funcName: "__onCollision", prettyName: "On Collision" },
  ];

  constructor() {
    this.eventEditor = window["monaco"].editor.create(document.getElementById('event-editor'), {
      value:       "",
      language:    "javascript",
      fontFamily:  "Inconsolata-g",
      lineNumbers: "off",
      fontSize:    13,
    });

    this.eventEditor.getModel().updateOptions({tabSize: 2});

    // showAutocompletion({
    //   "Shell": new Entity(),
    //   "Game": game,
    //   "Direction": {up: 0, down: 1, left: 2, right: 3}
    // });
  }

  selectEntity(ent: IBaseEntity) {
    this.selected = ent;
  }

  /**
   * Switches the event editor tabs. 
   **/
  onEventTabClick(event, data) {
    this.chosenEvent(data.funcName);

    this.updateEventEditor();
  }

  /**
   * Try to compile a function with the code in the event editor box.
   * If there's a syntax error, a popup will come up and neither the function member or its text member will change.
   **/
  onEventApplyButtonClick(event) {
    console.log(this);
    try {
      var func = new Function("event", this.eventEditor.getValue());
      this.selected[this.chosenEvent()] = func;
      this.selected[this.chosenEvent() + "String"] = this.eventEditor.getValue();
      this.updateEventEditor();
    }
    catch (e) {
      alert(e);
    }
  }

  /**
   * Unload the contents of the entity's event function string into the Shell box
   **/
  updateEventEditor() {
    if (!this.selected) {
      this.eventEditor.setValue("");
    }
    else {
      this.eventEditor.setValue(this.selected[this.chosenEvent()+"String"]); 
    }
  }
}