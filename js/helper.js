////////
// Helper functions
////////

function updatePropertiesTable() {
  while (Editor.propertiesTable.lastElementChild !== null) {
    Editor.propertiesTable.lastElementChild.querySelectorAll("input")[0].removeEventListener("change", Hooks.onPropertyFieldChange);
    Editor.propertiesTable.removeChild(Editor.propertiesTable.lastElementChild);
  }

  if (Editor.selected === false) return;

  for (var key in Editor.selected) {
    if (typeof Editor.selected[key] !== "function") {
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
      editorField.value = Editor.selected[key];
      editorCol.appendChild(editorField);
      editorField.addEventListener("change", Hooks.onPropertyFieldChange);
      editorField.setAttribute("data-key", key);
      row.appendChild(editorCol);

      Editor.propertiesTable.appendChild(row);
    }
  }
}

function updateEventEditor() {
  if (!Editor.selected) {
    Editor.eventEditor.value = "";
    return;
  }

  var selectedEvent = eventFuncs[Editor.eventList.selectedIndex];

  var funcString = ""+Editor.selected[selectedEvent];
  var bodyBegin = funcString.indexOf("{")+2, bodyEnd = funcString.lastIndexOf("}")-1;
  funcString = funcString.substring(bodyBegin, bodyEnd);

  Editor.eventEditor.value = funcString;
}

function updateKeyData() {
  for (var key in Game.Controls.keyData) {
    var data = Game.Controls.keyData[key];
    data.wasPressed = data.pressed;
  }
}

function resolveKeyID(s) {
  if (s == "up")    return "&";
  if (s == "down")  return "(";
  if (s == "left")  return "%";
  if (s == "right") return "'";

  return s.toUpperCase();
}

function pointInBox(point, box) {
  return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
}

function boxIntersection(a, b) {
  return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
}