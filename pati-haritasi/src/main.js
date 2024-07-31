


console.log("main.js");
let user_panel_is_open = false;
document.getElementById('btn_user').addEventListener('click', () => {
  if (!user_panel_is_open) {
    user_panel_is_open = true;
    showUserSettings();
  } else {
    user_panel_is_open = false;
    closeDiv('div_user_settings');
  }
})
function showUserSettings() {
  console.log("showUserSettings()");
  document.getElementById("div_user_settings").style.display = "block";
}
export function closeDiv(divId) {
  console.log("closeDiv()");
  var div = document.getElementById(divId);
  if (div) {
    div.style.display = "none";
  } else {
    console.error(`"${divId}" id'sine sahip bir element bulunamadı.`);
  }
}

export function listBreedsInFilterScreen(animalName) {
  let container;
  if (animalName == 'dog') {
    container = document.getElementById('div_dog_scrollable_checkbox_container');
  } else if (animalName == 'cat') {
    container = document.getElementById('div_cat_scrollable_checkbox_container');
  }
  fetch('animals/breeds.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((breeds) => {
      if (animalName == 'dog') {
        breeds['dog'].forEach((breed) => {
          let checkBoxItem = document.createElement('div');
          checkBoxItem.innerHTML = `
          <input type="checkbox" name="dog_breeds" value="${breed}">
          <label style="color: #000;font-size: 0.9em;">${breed}</label>`;
          container.appendChild(checkBoxItem);
        });
      } else if (animalName == 'cat') {
        breeds['cat'].forEach((breed) => {
          let checkBoxItem = document.createElement('div');
          checkBoxItem.innerHTML = `
          <input type="checkbox" name="cat_breeds" value="${breed}">
          <label style="color: #000;font-size: 0.9em;">${breed}</label>`;
          container.appendChild(checkBoxItem);
        });
      }

    });
}
window.showUserSettings = showUserSettings;
window.closeDiv = closeDiv;