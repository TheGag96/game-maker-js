let ko = require("knockout");

export class PropertiesViewModel {
  props = ko.observableArray([]);
  
  selected: IBaseEntity = null;

  constructor() {
  }

  selectEntity(ent: IBaseEntity) {
    this.selected = ent;
    let newArr    = [];

    for (let key in ent) {
      if (typeof ent[key] === "function" || key.substring(0, 2) === "__") continue;

      let newObserve = {name: key, stuff: ko.observable(ent[key])};
      newArr.push(newObserve);

      var self = this;
      newObserve.stuff.subscribe(function(newVal) {
        if (!self.setPropWithType(this.name, newVal)) {
          this.stuff(self.selected[this.name]);
        }
      }, newObserve);
    }

    this.props(newArr);
  };

  setPropWithType(key, value) {
    if (typeof this.selected[key] === "number") {
      let toNum = +value;

      if (!isNaN(toNum)) {
        this.selected[key] = toNum;
        return true;
      }
      return false;
    }
    else if (typeof this.selected[key] === "boolean") {
      let toBoolStr = value.trim().toLowerCase();

      this.selected[key] = toBoolStr == "true" || toBoolStr == "1";
    }
    else {
      this.selected[key] = value;
    }

    return true;
  }

  updateProperties() {
    for (let prop of this.props()) {
      prop.stuff(this.selected[prop.name]);
    }
  }
};