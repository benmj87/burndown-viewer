function clearList(dropdown) {
    for (var i = 0; i < dropdown.options.length; i++) {
        dropdown.options[i] = null;
    }
}

function newOption(text, value) {
    var option = document.createElement("option");
    option.text = text;
    option.value = value;
    return option;
}

function getSelectedOptions(dropdown) {
    var items = [];
    for (var i = 0; i < dropdown.options.length; i++) {
        if (dropdown.options[i].selected) {
            items.push.apply(items, [dropdown.options[i].value]);
        }
    }

    return items;
}