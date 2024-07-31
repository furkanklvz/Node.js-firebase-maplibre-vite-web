import '../style.css'
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getFirestore, collection, addDoc, getDocs, query, where, Timestamp, GeoPoint, deleteDoc, getDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, list, ref, uploadBytes } from "firebase/storage";
import { viewNotice } from './view_notice';
import { listBreedsInFilterScreen } from './main';

console.log("map.js");

const firebaseConfig = {
    apiKey: "",
    authDomain: "web-maplibre.firebaseapp.com",
    projectId: "web-maplibre",
    storageBucket: "web-maplibre.appspot.com",
    messagingSenderId: "",
    appId: "",
    databaseURL: "",
  };

let app = initializeApp(firebaseConfig);
let auth = getAuth(app);
let db = getFirestore(app);
const storage = getStorage();



let markerMap = new Map();



let map = new maplibregl.Map({
    container: 'app',
    style: 
    center: [29, 41],
    zoom: 9.5,
    maxZoom: 14
});
let bounds = [
    [27.5, 40.3],
    [30.5, 41.8]
];
const coordinates = [
    [28.9470386, 41.0825164],
    [29.1042085, 41.0544907],
    [29.1470386, 41.125164],
    [28.1042085, 42.0544907],
    [29.670386, 41.025164]
];
var displayStyleforMapEffect;
map.setMaxBounds(bounds);
map.on('load', async () => {
    console.log("Harita yüklendi");
    showMarkers();
    veterinerleri_listele();
    await barinaklari_listele();
    displayStyleforMapEffect = window.getComputedStyle(btn_user).display;
    if (displayStyleforMapEffect == 'none') {
        flyToCoordinates(coordinates);
    }

})
export let marker;
let district;
let popup = new maplibregl.Popup({ offset: 25, closeButton: false, className: "maplibre-popup-content", closeOnClick: false })
    .setText('İlan bu bölge için oluşturulacak');
let ilan_olustur = false;
let sahiplendir = false;


function flyToCoordinates(coords, index = 0) {
    if (index >= coords.length) {
        index = 0;
    }

    map.flyTo({
        center: coords[index],
        essential: true,
        zoom: 11.5,
        speed: 0.06,
        curve: 1,
        easing(t) {
            return t;
        }
    });

    setTimeout(() => {
        displayStyleforMapEffect = window.getComputedStyle(btn_user).display;
        if (displayStyleforMapEffect == 'none') {
            flyToCoordinates(coords, index + 1);
        } else {
            map.flyTo({
                center: [29, 41],
                essential: true,
                zoom: 9.5
            });
            return
        }

    }, 1700);
}
document.getElementById("btn_kayip_ilani_ver").addEventListener('click', () => {
    console.log("btn_kayip_ilani_ver");
    if (!ilan_olustur) {
        document.getElementById('p_create_notice_title').innerHTML = 'KAYIP HAYVAN İLANI OLUŞTUR';
        document.getElementById("btn_sahiplendir").style.display = "none";
        let divViewNotice = document.getElementById('div_view_notice');
        if (divViewNotice) {
            divViewNotice.style.display = 'none';
        }
        document.getElementById('div_user_settings').style.display = 'none';
        document.getElementById('div_my_notices').style.display = 'none';
        document.getElementById('div_my_chats').style.display = 'none';
        document.getElementById('div_search_container').style.display = 'none';
        document.getElementById('div_fiter_container').style.display = 'none';
        if (markerMap.size != 0) {
            markerMap.forEach((imarker, id) => {
                imarker.remove();
            })
        }
        document.getElementById("div_ilan_olustur").style.display = "block";
        document.getElementById("btn_kayip_ilani_ver").textContent = "Vazgeç";
        document.getElementById("btn_kayip_ilani_ver").style.backgroundColor = "red";

        ilan_olustur = true;
        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "block";
        marker = new maplibregl.Marker({ draggable: true })
            .setLngLat(map.getCenter())
            .setPopup(popup)
            .addTo(map);
        marker.on('dragend', (e) => {
            let pixelCoordinates = map.project(marker.getLngLat());

            console.log(e, pixelCoordinates);
            let features = map.queryRenderedFeatures(pixelCoordinates);
            for (let index = 0; index < features.length; index++) {
                if (features[index].layer.id == "ilce") {
                    console.log(features[index].properties.isim + ": " + marker.getLngLat().toString())
                    popup.textContent = features[index].properties.isim;
                    district = features[index].properties.isim;
                }
                console.log(features[index]);
            }

        });

    } else {
        if (markerMap.size != 0) {
            markerMap.forEach((imarker, id) => {
                if (!imarker._map) {
                    imarker.setLngLat(imarker.getLngLat()).addTo(map);
                }
            })
        }
        document.getElementById('div_search_container').style.display = 'flex';
        document.getElementById("btn_sahiplendir").style.display = "block";
        document.getElementById("btn_ilan_olustur").style.display = "block";
        document.getElementById("ilan_olusturma_formu").style.display = "none";
        document.getElementById("div_ilan_olustur").style.display = "none";
        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "none";
        document.getElementById("btn_kayip_ilani_ver").textContent = "Kayıp Hayvan İlanı Ver";
        document.getElementById("btn_kayip_ilani_ver").style.backgroundColor = "white";

        marker.remove();

        ilan_olustur = false;
    }

})
document.getElementById('btn_ilan_olustur').addEventListener('click', () => {
    marker.setDraggable(false);
    popup.setText("Konum Seçildi");
    creatNotice(district);
});
document.getElementById('btn_shp_form_ac').addEventListener('click', () => {
    marker.setDraggable(false);
    popup.setText("Konum Seçildi");
    createAbortingNotice(district);
});


let div_sahiplendir = document.getElementById("div_sahiplendir");
document.getElementById('btn_sahiplendir').addEventListener('click', () => {
    console.log('sahiplendir()');
    if (!sahiplendir) {
        document.getElementById('p_create_notice_title').innerHTML = 'HAYVAN SAHİPLENDİRME İLANI OLUŞTUR';
        document.getElementById("btn_kayip_ilani_ver").style.display = "none";
        let divViewNotice = document.getElementById('div_view_notice');
        if (divViewNotice) {
            divViewNotice.style.display = 'none';
        }
        document.getElementById('div_user_settings').style.display = 'none';
        document.getElementById('div_my_notices').style.display = 'none';
        document.getElementById('div_my_chats').style.display = 'none';
        document.getElementById('div_search_container').style.display = 'none';
        document.getElementById('div_fiter_container').style.display = 'none';
        if (markerMap.size != 0) {
            markerMap.forEach((imarker, id) => {
                imarker.remove();
            })
        }

        div_sahiplendir.style.display = "block";
        document.getElementById("btn_sahiplendir").textContent = "Vazgeç";
        document.getElementById("btn_sahiplendir").style.backgroundColor = "red";
        sahiplendir = true;
        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "block";

        marker = new maplibregl.Marker({ draggable: true })
            .setLngLat(map.getCenter())
            .setPopup(popup)
            .addTo(map);
        marker.on('dragend', (e) => {
            let pixelCoordinates = map.project(marker.getLngLat());

            console.log(e, pixelCoordinates);
            let features = map.queryRenderedFeatures(pixelCoordinates);
            for (let index = 0; index < features.length; index++) {
                if (features[index].layer.id == "ilce") {
                    console.log(features[index].properties.isim + ": " + marker.getLngLat().toString())
                    popup.textContent = features[index].properties.isim;
                    district = features[index].properties.isim;
                }
                console.log(features[index]);
            }

        });
    } else {
        if (markerMap.size != 0) {
            markerMap.forEach((imarker, id) => {
                if (!imarker._map) {
                    imarker.setLngLat(imarker.getLngLat()).addTo(map);
                }
            })
        }
        document.getElementById("btn_sahiplendir").style.display = "block";
        document.getElementById("btn_kayip_ilani_ver").style.display = "block";
        document.getElementById("shp_ilan_olusturma_formu").style.display = "none";
        div_sahiplendir.style.display = "none";
        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "none";
        document.getElementById("btn_sahiplendir").textContent = "Hayvan Sahiplendir";
        document.getElementById("btn_sahiplendir").style.backgroundColor = "white";
        document.getElementById('div_search_container').style.display = 'flex';
        marker.remove();

        sahiplendir = false;
    }
})

export async function showMarkers(noticeIds = [-1]) {
    console.log("showMarkers(): " + noticeIds);
    if (markerMap.size != 0) {
        markerMap.forEach((imarker, id) => {
            imarker.remove();
        })
        markerMap.clear();
    }

    if (noticeIds.length === 1 && noticeIds.includes(-1)) {
        console.log('Tüm markerlar seçildi');
        let querySnapshot = await getDocs(collection(db, "notices"));
        querySnapshot.forEach((doc) => {
            var data = doc.data();
            var markergeoPoint = data["locationLatLng"];
            let markerLatLng = [markergeoPoint.longitude, markergeoPoint.latitude];

            var el = document.createElement('div');
            switch (data['animal']) {
                case 'Köpek':
                    if (data['missing_or_adopted'] == 'missing') {
                        el.className = 'marker_missing_dog';
                    } else {
                        el.className = 'marker_adopted_dog';
                    }
                    break;
                case 'Kedi':
                    if (data['missing_or_adopted'] == 'missing') {
                        el.className = 'marker_missing_cat';
                    } else {
                        el.className = 'marker_adopted_cat';
                    }
                    break;
                default:
                    el.className = 'marker';
                    break;
            }


            var noticeTitlePopup = new maplibregl.Popup({ offset: 25, closeButton: false, className: "custom-popup", closeOnClick: false })
                .setText(data['title']);
            var annMarker = new maplibregl.Marker({ element: el })
                .setLngLat(markerLatLng)
                .addTo(map);
            markerMap.set(doc.id, annMarker);
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (data['missing_or_adopted'] == 'missing') {
                    viewNotice(doc.id, false);
                } else {
                    viewNotice(doc.id, true);
                }
            });
            el.addEventListener('mouseenter', () => {
                noticeTitlePopup.setLngLat(markerLatLng).addTo(map);
            });

            el.addEventListener('mouseleave', () => {
                noticeTitlePopup.remove();
            });
        })
    } else {
        noticeIds.forEach(id => {
            getDoc(doc(db, 'notices', id)).then((docSnapshot) => {
                if (docSnapshot.exists) {
                    var data = docSnapshot.data();
                    var markergeoPoint = data["locationLatLng"];
                    let markerLatLng = [markergeoPoint.longitude, markergeoPoint.latitude];

                    var el = document.createElement('div');
                    switch (data['animal']) {
                        case 'Köpek':
                            if (data['missing_or_adopted'] == 'missing') {
                                el.className = 'marker_missing_dog';
                            } else {
                                el.className = 'marker_adopted_dog';
                            }
                            break;
                        case 'Kedi':
                            if (data['missing_or_adopted'] == 'missing') {
                                el.className = 'marker_missing_cat';
                            } else {
                                el.className = 'marker_adopted_cat';
                            }
                            break;
                        default:
                            el.className = 'marker';
                            break;
                    }


                    var noticeTitlePopup = new maplibregl.Popup({ offset: 25, closeButton: false, className: "custom-popup", closeOnClick: false })
                        .setText(data['title']);
                    var annMarker = new maplibregl.Marker({ element: el })
                        .setLngLat(markerLatLng)
                        .addTo(map);
                    markerMap.set(docSnapshot.id, annMarker);
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (data['missing_or_adopted'] == 'missing') {
                            viewNotice(docSnapshot.id, false);
                        } else {
                            viewNotice(docSnapshot.id, true);
                        }
                    });
                    el.addEventListener('mouseenter', () => {
                        noticeTitlePopup.setLngLat(markerLatLng).addTo(map);
                    });

                    el.addEventListener('mouseleave', () => {
                        noticeTitlePopup.remove();
                    });
                } else { console.log('doc bulunamadı'); }


            });
        });
    }
}


let imageInput = document.getElementById("input_image");
let imageInputAborting = document.getElementById('shp_input_image');
let imagePreview = document.getElementById('image-preview');
let imagePreviewAboritng = document.getElementById('shp_image-preview');
let notice_image;
let title;
let description;
let neighborhood;
let selectNeighboorhood;
let noticeDistrict;
let animal;
let breed;
let age;
function createAbortingNotice(district) {
    document.getElementById("shp_ilan_baslik").value = '';
    document.getElementById("shp_ilan_aciklama").value = '';
    imageInputAborting.value = '';
    imagePreviewAboritng.innerHTML = '';
    console.log("creatNoticeAborting()");
    noticeDistrict = district;
    setNeighborhoodsToOptions(district, "shp_neighborhood_select")
    const animalSelect = document.getElementById('shp_select_animal');
    animalSelect.innerHTML = '';
    var defOption = document.createElement('option');
    defOption.value = 'defaultAnimal';
    defOption.textContent = 'Tür Seçiniz..';
    animalSelect.appendChild(defOption);
    const selectDog = document.createElement('option');
    selectDog.value = 'Köpek';
    selectDog.textContent = 'Köpek';
    animalSelect.appendChild(selectDog);
    const selectCat = document.createElement('option');
    selectCat.value = 'Kedi';
    selectCat.textContent = 'Kedi';
    animalSelect.appendChild(selectCat);
    const selectOther = document.createElement('option');
    selectOther.value = 'diger';
    selectOther.textContent = 'Diğer';
    animalSelect.appendChild(selectOther);
    const breedSelect = document.getElementById('shp_select_breed');
    animalSelect.addEventListener('change', (event) => {
        const selectedAnimal = event.target.value;
        console.log('SelectedAnimal: ' + selectedAnimal);

        breedSelect.innerHTML = '';


        fetch('animals/breeds.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((breeds) => {
                if (selectedAnimal == 'Köpek') {
                    breeds['dog'].forEach((breed) => {
                        console.log(breed);
                        console.log(breed);
                        let option = document.createElement('option');
                        option.value = breed;
                        option.textContent = breed;
                        breedSelect.appendChild(option);
                    })
                } else if (selectedAnimal == 'Kedi') {
                    breeds['cat'].forEach((breed) => {
                        console.log(breed);
                        console.log(breed);
                        let option = document.createElement('option');
                        option.value = breed;
                        option.textContent = breed;
                        breedSelect.appendChild(option);
                    })
                }
            })

    })

    console.log(district);
    document.getElementById("btn_shp_form_ac").style.display = "none";
    document.getElementById("shp_ilan_olusturma_formu").style.display = "block";
}

function creatNotice(district) {
    document.getElementById("ilan_baslik").value = '';
    document.getElementById("ilan_aciklama").value = '';
    imageInput.value = '';
    imagePreview.innerHTML = '';
    console.log("creatNotice()");
    noticeDistrict = district;
    setNeighborhoodsToOptions(district, "neighborhood_select")
    const animalSelect = document.getElementById('select_animal');
    animalSelect.innerHTML = '';
    var defOption = document.createElement('option');
    defOption.value = 'defaultAnimal';
    defOption.textContent = 'Tür Seçiniz..';
    animalSelect.appendChild(defOption);
    const selectDog = document.createElement('option');
    selectDog.value = 'Köpek';
    selectDog.textContent = 'Köpek';
    animalSelect.appendChild(selectDog);
    const selectCat = document.createElement('option');
    selectCat.value = 'Kedi';
    selectCat.textContent = 'Kedi';
    animalSelect.appendChild(selectCat);
    const selectOther = document.createElement('option');
    selectOther.value = 'diger';
    selectOther.textContent = 'Diğer';
    animalSelect.appendChild(selectOther);
    const breedSelect = document.getElementById('select_breed');
    animalSelect.addEventListener('change', (event) => {
        const selectedAnimal = event.target.value;
        console.log('SelectedAnimal: ' + selectedAnimal);

        breedSelect.innerHTML = '';


        fetch('animals/breeds.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((breeds) => {
                if (selectedAnimal == 'Köpek') {
                    breeds['dog'].forEach((breed) => {
                        console.log(breed);
                        console.log(breed);
                        let option = document.createElement('option');
                        option.value = breed;
                        option.textContent = breed;
                        breedSelect.appendChild(option);
                    })
                } else if (selectedAnimal == 'Kedi') {
                    breeds['cat'].forEach((breed) => {
                        console.log(breed);
                        console.log(breed);
                        let option = document.createElement('option');
                        option.value = breed;
                        option.textContent = breed;
                        breedSelect.appendChild(option);
                    })
                }
            })

    })

    console.log(district);
    document.getElementById("btn_ilan_olustur").style.display = "none";
    document.getElementById("ilan_olusturma_formu").style.display = "block";
}
imageInput.addEventListener('change', () => {
    notice_image = imageInput.files[0];
    if (notice_image) {
        let reader = new FileReader();
        reader.addEventListener('load', () => {
            imagePreview.innerHTML = `<img  src="${reader.result}" alt="Görsel">`;
        });
        reader.readAsDataURL(notice_image);
    } else {
        imagePreview.innerHTML = '<span >Görsel Önizlemesi</span>';
    }
});
imageInputAborting.addEventListener('change', () => {
    notice_image = imageInputAborting.files[0];
    if (notice_image) {
        let reader = new FileReader();
        reader.addEventListener('load', () => {
            imagePreviewAboritng.innerHTML = `<img src="${reader.result}" alt="Görsel">`;
        });
        reader.readAsDataURL(notice_image);
    } else {
        imagePreviewAboritng.innerHTML = '<span>Görsel Önizlemesi</span>';
    }
});
document.getElementById("btn_ilan_onayla").addEventListener('click', uploadNotice);
document.getElementById("shp_btn_yayınla").addEventListener('click', uploadAbortingNotice);

async function uploadNotice() {
    let progressCircle = document.createElement('div');
    progressCircle.className = 'spinner';
    console.log("createNotice()");
    title = document.getElementById("ilan_baslik").value.trim();
    description = document.getElementById("ilan_aciklama").value.trim();
    selectNeighboorhood = document.getElementById('neighborhood_select');
    neighborhood = selectNeighboorhood.options[selectNeighboorhood.selectedIndex].value;
    var selectAnimal = document.getElementById('select_animal');
    animal = selectAnimal.options[selectAnimal.selectedIndex].value;
    var selectBreed = document.getElementById('select_breed');
    breed = selectBreed.options[selectBreed.selectedIndex].value;
    if (title && description && neighborhood != "İstanbul" && notice_image && animal && breed) {

        document.getElementById("btn_ilan_onayla").disabled = true;
        document.getElementById('div_ilan_olustur').appendChild(progressCircle);
        let storageRef = ref(storage, 'notice_images/' + auth.currentUser.uid + "/" + notice_image.name);
        uploadBytes(storageRef, notice_image)
            .then(() => {
                getDownloadURL(storageRef).then((downloadURL) => {
                    console.log(downloadURL);
                    addDoc(collection(db, "notices"), {
                        imageURL: downloadURL,
                        createdBy: auth.currentUser.uid,
                        creationDate: Timestamp.now(),
                        title: title,
                        description: description,
                        animal: animal,
                        breed: breed,
                        missing_or_adopted: 'missing',
                        locationLatLng: new GeoPoint(marker.getLngLat().lat, marker.getLngLat().lng),
                        district: noticeDistrict,
                        neighborhood: neighborhood
                    }).then((docRef) => {
                        progressCircle.style.display = 'none';
                        document.getElementById("btn_ilan_onayla").disabled = false;
                        console.log("Document written with ID: ", docRef.id);
                        document.getElementById("myModal").style.display = "block";
                        document.getElementById("btn_ilan_olustur").style.display = "block";
                        document.getElementById('div_search_container').style.display = 'flex';
                        document.getElementById("btn_sahiplendir").style.display = "block";
                        document.getElementById("ilan_olusturma_formu").style.display = "none";
                        document.getElementById("div_ilan_olustur").style.display = "none";
                        document.getElementById("btn_kayip_ilani_ver").textContent = "Kayıp İlanı Ver";
                        document.getElementById("btn_kayip_ilani_ver").style.backgroundColor = "white";
                        marker.remove();
                        ilan_olustur = false;
                        showMarkers();
                        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "none";
                    })
                })
            })
    }
    else {
        console.log("title:" + title + "desc:" + description + "neig:" + neighborhood + "img:" + notice_image + "anim:" + animal + "breed:" + breed)
        alert("Lütfen tüm alanları doldurun.");
    }
}
async function uploadAbortingNotice() {
    let progressCircle = document.createElement('div');
    progressCircle.className = 'spinner';
    console.log("createAbortingNotice()");
    title = document.getElementById("shp_ilan_baslik").value.trim();
    description = document.getElementById("shp_ilan_aciklama").value.trim();
    age = document.getElementById('shp_yas').value.trim();
    selectNeighboorhood = document.getElementById('shp_neighborhood_select');
    neighborhood = selectNeighboorhood.options[selectNeighboorhood.selectedIndex].value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    var selectAnimal = document.getElementById('shp_select_animal');
    animal = selectAnimal.options[selectAnimal.selectedIndex].value;
    var selectBreed = document.getElementById('shp_select_breed');
    breed = selectBreed.options[selectBreed.selectedIndex].value;
    if (title && description && neighborhood != "İstanbul" && notice_image && animal && breed && age) {

        document.getElementById("shp_btn_yayınla").disabled = true;
        document.getElementById('div_sahiplendir').appendChild(progressCircle);
        let storageRef = ref(storage, 'adoption_notice_images/' + auth.currentUser.uid + "/" + notice_image.name);
        uploadBytes(storageRef, notice_image)
            .then(() => {
                getDownloadURL(storageRef).then((downloadURL) => {
                    console.log(downloadURL);
                    addDoc(collection(db, "notices"), {
                        imageURL: downloadURL,
                        createdBy: auth.currentUser.uid,
                        creationDate: Timestamp.now(),
                        title: title,
                        description: description,
                        animal: animal,
                        breed: breed,
                        age: age,
                        gender: gender,
                        missing_or_adopted: 'adopted',
                        locationLatLng: new GeoPoint(marker.getLngLat().lat, marker.getLngLat().lng),
                        district: noticeDistrict,
                        neighborhood: neighborhood
                    }).then((docRef) => {
                        progressCircle.style.display = 'none';
                        document.getElementById("shp_btn_yayınla").disabled = false;
                        console.log("Document written with ID: ", docRef.id);
                        document.getElementById("myModal").style.display = "block";
                        document.getElementById("btn_sahiplendir").style.display = "block";
                        document.getElementById('div_search_container').style.display = 'flex';
                        document.getElementById("shp_ilan_olusturma_formu").style.display = "none";
                        document.getElementById("div_sahiplendir").style.display = "none";
                        document.getElementById("btn_sahiplendir").textContent = "Kayıp İlanı Ver";
                        document.getElementById("btn_sahiplendir").style.backgroundColor = "white";
                        document.getElementById('btn_kayip_ilani_ver').style.display = "block";
                        marker.remove();
                        sahiplendir = false;
                        showMarkers();
                        document.getElementById("div_ilan_olusturma_yonergesi").style.display = "none";
                    })
                })
            })
    }
    else {
        console.log("title:" + title + "desc:" + description + "neig:" + neighborhood + "img:" + notice_image + "anim:" + animal + "breed:" + breed)
        alert("Lütfen tüm alanları doldurun.");
    }
}




document.getElementById("model_close").onclick = function () {
    document.getElementById("myModal").style.display = "none";
}
function setNeighborhoodsToOptions(district, selectId) {
    console.log("setNeighborhoodsToOptions(): " + district);
    let neighborhoodSelect = document.getElementById(selectId);
    neighborhoodSelect.innerHTML = '';

    fetch('neighborhoods/neighborhoods.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(mahalleler => {
            return convertToEnglish(district).then(englishDistrict => {
                console.log("district: " + district + " eng")
                if (mahalleler[englishDistrict]) {
                    let optionAll = document.createElement('option');
                    optionAll.value = 'Tümü';
                    optionAll.textContent = 'Tümü';
                    neighborhoodSelect.appendChild(optionAll);
                    mahalleler[englishDistrict].forEach(mahalle => {
                        let option = document.createElement('option');
                        option.value = mahalle;
                        option.textContent = mahalle;
                        neighborhoodSelect.appendChild(option);
                    });
                    console.log('başarılı', englishDistrict);
                } else {
                    console.error('Belirtilen ilçe için mahalle bilgisi bulunamadı:', englishDistrict);
                }
            });
        })
        .catch(error => {
            console.error('Fetch işlemi sırasında bir hata oluştu:', error);
        });
}

function convertToEnglish(word) {
    console.log("convertToEnglish(): " + word);
    return fetch('neighborhoods/tr_to_eng.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            console.log('returned : ' + data[word]);
            return data[word];
        });
}
map.on('click', (e) => {
    console.log("tıklandı");
    if (!e.originalEvent.target.classList.contains('marker')) {
        console.log("marker değil");
        var view_notice_div = document.getElementById("div_view_notice");
        if (view_notice_div) {
            console.log("kapatıldı");
            view_notice_div.style.display = 'none';
        }
    }
})
document.getElementById("btn_my_notices").addEventListener('click', () => listNotices(false));
document.getElementById("btn_my_adoption_notices").addEventListener('click', () => listNotices(true));
async function listNotices(isAdobtionNotice) {
    var collectionName = 'notices';
    var missing_or_adopted = 'missing';
    if (isAdobtionNotice) {
        missing_or_adopted = 'adopted';
    }
    document.getElementById('ul_my_notices').innerHTML = '';
    var q = query(
        collection(db, collectionName),
        where("createdBy", "==", auth.currentUser.uid),
        where("missing_or_adopted", "==", missing_or_adopted)
    );
    var querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnapshot) => {
        var data = docSnapshot.data();
        let listItem = document.createElement('li');
        let listDivItem = document.createElement('div');
        listDivItem.className = 'div_notice_list';
        listItem.appendChild(listDivItem);
        let list_p = document.createElement('p');
        list_p.className = 'p_noticelist_item';
        listDivItem.appendChild(list_p);
        let list_del_notice = document.createElement('button');
        list_del_notice.className = 'btn_delete_notice';
        listDivItem.appendChild(list_del_notice);

        listItem.className = 'li_notices';
        list_p.textContent = data['title'];
        console.log(data['title']);
        document.getElementById('ul_my_notices').appendChild(listItem);
        list_del_notice.addEventListener('click', (e) => {
            e.stopPropagation();
            let confirmation = confirm("Bu ilanı kalıcı olarak yayından kaldırmak istediğinizden emin misiniz?");
            if (confirmation) {
                deleteDoc(doc(db, collectionName, docSnapshot.id)).then(() => {
                    listItem.remove();
                    if (markerMap.has(docSnapshot.id)) {
                        console.log("marker kaldırıldı");
                        markerMap.get(docSnapshot.id).remove();
                        markerMap.delete(docSnapshot.id);
                    }
                    alert("İlan yayından kaldırıldı!");
                }).catch((e) => {
                    alert("Dosya silinirken bir hata oluştu: " + e);
                })


            } else {
                console.log("Silme işlemi iptal edildi.");
            }
        })
        listItem.addEventListener('click', () => {

            map.flyTo({
                center: [data['locationLatLng'].longitude, data['locationLatLng'].latitude],
                essential: true,
                zoom: 13
            });
            console.log('harita uçtu: ' + data['locationLatLng']);
            viewNotice(docSnapshot.id, isAdobtionNotice);
        });
    });

    document.getElementById("div_user_settings").style.display = "none";
    document.getElementById("div_my_notices").style.display = "block";
}
document.getElementById('searched_word').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('search_button').click();
    }
});
document.getElementById('search_button').addEventListener('click', () => {
    if (markerMap.size != 0) {
        markerMap.forEach((imarker, id) => {
            imarker.remove();
        })
        markerMap.clear();
    }
    let filter = document.getElementById('searched_word').value.trim();
    getDocs(collection(db, "notices")).then((snapshot) => {
        if (snapshot) {
            var noticeIds = [];
            snapshot.forEach((docSnapshot) => {

                let data = docSnapshot.data();
                if (data['title'].toLowerCase().includes(filter.toLowerCase())) {
                    noticeIds.push(docSnapshot.id);
                    document.getElementById('btn_cancel_search').style.display = 'block';
                }
            });
            showMarkers(noticeIds);
        } else {
            console.log("hata");
        }

    });
});
document.getElementById('btn_cancel_search').addEventListener('click', () => {
    document.getElementById('btn_cancel_search').style.display = 'none';
    document.getElementById('searched_word').value = '';
    showMarkers();
})
let filterIsOpen = false;
const districts = [
    "Tümü", "ADALAR", "ARNAVUTKÖY", "ATAŞEHİR", "AVCILAR", "BAĞCILAR", "BAHÇELİEVLER", "BAKIRKÖY", "BAŞAKŞEHİR", "BAYRAMPAŞA",
    "BEŞİKTAŞ", "BEYKOZ", "BEYLİKDÜZÜ", "BEYOĞLU", "BÜYÜKÇEKMECE", "ÇATALCA", "ÇEKMEKÖY", "ESENLER", "ESENYURT", "EYÜPSULTAN",
    "FATİH", "GAZİOSMANPAŞA", "GÜNGÖREN", "KADIKÖY", "KAĞITHANE", "KARTAL", "KÜÇÜKÇEKMECE", "MALTEPE", "PENDİK", "SANCAKTEPE",
    "SARIYER", "SİLİVRİ", "SULTANBEYLİ", "SULTANGAZİ", "ŞİLE", "ŞİŞLİ", "TUZLA", "ÜMRANİYE", "ÜSKÜDAR", "ZEYTİNBURNU",
];
let filter_district_select = document.getElementById('select_filter_district');
districts.forEach((districtName) => {
    var option = document.createElement('option');
    option.value = districtName;
    option.textContent = districtName;
    filter_district_select.appendChild(option);
})
document.getElementById('filter_button').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!filterIsOpen) {
        document.getElementById('div_fiter_container').style.display = 'flex';
        document.getElementById('div_dog_scrollable_checkbox_container').innerHTML =
            `<input type="checkbox" name="dog_breeds" value="Tümü" checked>
          <label style="color: #000;font-size: 1em;">Tümü</label>`;
        document.getElementById('div_fiter_container').style.display = 'flex';
        document.getElementById('div_cat_scrollable_checkbox_container').innerHTML =
            `<input type="checkbox" name="cat_breeds" value="Tümü" checked>
          <label style="color: #000;font-size: 1em;">Tümü</label>`;
        filterIsOpen = true;
    } else {
        document.getElementById('div_fiter_container').style.display = 'none';
        filterIsOpen = false;
    }
    listBreedsInFilterScreen('dog');
    listBreedsInFilterScreen('cat');
})
filter_district_select.addEventListener('change', (event) => {
    const selectedDistrict = event.target.value;
    console.log("seçildi: " + selectedDistrict);
    if (selectedDistrict == 'Tümü') {
        document.getElementById('div_select_filter_neighborhood').style.display = 'none';
    } else {
        document.getElementById('div_select_filter_neighborhood').style.display = 'flex';
        setNeighborhoodsToOptions(selectedDistrict, 'select_filter_neighborhood');
    }
});
document.getElementById('cb_filter_dog').addEventListener('change', (event) => {
    if (event.target.checked) {
        document.getElementById('div_filter_dog_breeds').style.display = 'block';
    } else {
        document.getElementById('div_filter_dog_breeds').style.display = 'none';
    }
})
document.getElementById('cb_filter_cat').addEventListener('change', (event) => {
    if (event.target.checked) {
        document.getElementById('div_filter_cat_breeds').style.display = 'block';
    } else {
        document.getElementById('div_filter_cat_breeds').style.display = 'none';
        document.getElementById('filter_cat').style.backgroundColor = 'transparent';
    }
})
document.getElementById('btn_filtre_onayla').addEventListener('click', () => {
    var noticeIds = [];
    var showDogs;
    var showCats;
    var showVets;
    var showShelters;
    var showMissingAnimals;
    var showAdoptedAnimals;
    var gender_select;
    var selected_gender;
    var district_select;
    var selected_district;
    var neighborhood_select;
    var selected_neighborhood;
    let collectionRef = collection(db, 'notices');
    let queryConstraints = [];
    showDogs = document.getElementById('cb_filter_dog').checked;
    showCats = document.getElementById('cb_filter_cat').checked;
    showVets = document.getElementById('cb_filter_vet').checked;
    showShelters = document.getElementById('cb_filter_shelter').checked;
    showMissingAnimals = document.getElementById('cb_filter_missing').checked;
    showAdoptedAnimals = document.getElementById('cb_filter_adoption').checked;
    if (showVets) {
        map.setLayoutProperty('veteriner_cluster', 'visibility', 'visible');
        map.setLayoutProperty('cluster-count', 'visibility', 'visible');
        map.setLayoutProperty('unclustered-point', 'visibility', 'visible');
    } else {
        map.setLayoutProperty('veteriner_cluster', 'visibility', 'none');
        map.setLayoutProperty('cluster-count', 'visibility', 'none');
        map.setLayoutProperty('unclustered-point', 'visibility', 'none');
    }
    if (showShelters) {
        map.setLayoutProperty('barinak_layer', 'visibility', 'visible');
    } else {
        map.setLayoutProperty('barinak_layer', 'visibility', 'none');
    }
    if (showMissingAnimals && !showAdoptedAnimals) {
        queryConstraints.push(where('missing_or_adopted', '==', 'missing'));
    } else if (!showMissingAnimals && showAdoptedAnimals) {
        queryConstraints.push(where('missing_or_adopted', '==', 'adopted'));
    } else if (!showMissingAnimals && !showAdoptedAnimals) {
        showMarkers([]);
        console.log("boş küme yollandı");
        return;
    }
    if (showDogs) {
        var selectedCheckboxes = document.querySelectorAll('input[name="dog_breeds"]:checked');
        var selectedValues = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (!selectedValues.includes('Tümü')) {
            queryConstraints.push(where('breed', 'in', selectedValues));
        }
    }
    if (showCats) {
        var selectedCheckboxes = document.querySelectorAll('input[name="cat_breeds"]:checked');
        var selectedValues = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (!selectedValues.includes('Tümü')) {
            queryConstraints.push(where('breed', 'in', selectedValues));
        }
    }

    if (showDogs && !showCats) {
        queryConstraints.push(where('animal', '==', 'Köpek'));
    } else if (!showDogs && showCats) {
        queryConstraints.push(where('animal', '==', 'Kedi'));
    } else if (!showDogs && !showCats) {
        showMarkers([]);
        console.log("boş küme yollandı");
        return;
    }
    district_select = document.getElementById('select_filter_district');
    selected_district = district_select.options[district_select.selectedIndex].value;
    console.log("district: " + selected_district);
    if (selected_district != 'Tümü') {
        neighborhood_select = document.getElementById('select_filter_neighborhood');
        selected_neighborhood = neighborhood_select.options[neighborhood_select.selectedIndex].value;
        queryConstraints.push(where('district', '==', selected_district));
        if (selected_neighborhood != 'Tümü') {
            queryConstraints.push(where('neighborhood', '==', selected_neighborhood));
        }
    }
    gender_select = document.getElementById('select_filter_gender');
    selected_gender = gender_select.options[gender_select.selectedIndex].value;
    if (selected_gender != 'Tümü') {
        queryConstraints.push(where('gender', '==', selected_gender));
    }


    let q = query(collectionRef, ...queryConstraints);
    getDocs(q).then((snapshot) => {
        if (!snapshot.empty) {
            snapshot.forEach((notice) => {
                noticeIds.push(notice.id);
            });
            console.log("filtre sonucu: " + noticeIds);
            showMarkers(noticeIds);
        } else {
            console.log('sonuç yok');
            alert('Aranan kriterlere göre sonuç bulunamadı');
        }
    });
});

async function veterinerleri_listele() {
    const image = await map.loadImage('images/veterinarian.png');
    map.addImage('custom-vet-marker', image.data);
    let veteriner_konumlari = new Map();
    let geojson = {
        type: "FeatureCollection",
        features: []
    };
    fetch('animals/SaglikKurum.json').then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
        .then((saglik_kurumlari) => {
            var records = saglik_kurumlari.result.records;
            records.forEach((kurum) => {
                if (kurum['Alt Kategori'] === 'Veteriner') {
                    veteriner_konumlari.set(kurum['Saglik Tesisi Adi'], [kurum['Longitude'], kurum['Latitude']]);
                }
            });
            veteriner_konumlari.forEach((value, key) => {
                geojson.features.push({
                    type: "Feature",
                    properties: {
                        id: key
                    },
                    geometry: {
                        type: "Point",
                        coordinates: value
                    }
                });
            });
            map.addSource('veterinerler', {
                type: 'geojson',
                data: geojson,
                cluster: true,
                clusterMaxZoom: 13,
                clusterRadius: 50
            });
            map.addLayer({
                id: 'veteriner_cluster',
                type: 'circle',
                source: 'veterinerler',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6',
                        100,
                        '#f1f075',
                        750,
                        '#f28cb1'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        100,
                        30,
                        750,
                        40
                    ]
                }
            });
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'veterinerler',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Regular'],
                    'text-size': 12
                }
            });

            map.addLayer({
                id: 'unclustered-point',
                type: 'symbol',
                source: 'veterinerler',
                filter: ['!', ['has', 'point_count']],
                layout: {
                    "icon-image": 'custom-vet-marker',
                    "icon-size": 0.2
                }
            });
            map.setLayoutProperty('veteriner_cluster', 'visibility', 'none');
            map.setLayoutProperty('cluster-count', 'visibility', 'none');
            map.setLayoutProperty('unclustered-point', 'visibility', 'none');
            map.on('click', 'unclustered-point', function (e) {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const description = e.features[0].properties.id;
                let link = `https://harita.istanbul/2d/detail/2124?@=28.97439,41.02751,18.00000&p=45.00000&b=0.00000&suk=&ruk=!&ms=!b281!c&o=!o1&ct=0&duk=${coordinates[1]},${coordinates[0]}&dwk=`;
                new maplibregl.Popup({ className: 'cluster_popup' })
                    .setLngLat(coordinates)
                    .setHTML(description + `<br/><a href="${link}" target="_blank">Yol Tarifi Al</a>`)
                    .addTo(map);
            });
        });
}
async function barinaklari_listele() {
    map.addSource('barinak_source', {
        type: 'geojson',
        data: 'animals/bakimevleri.geoJson'
    });
    const image = await map.loadImage('images/dog-house.png');
    map.addImage('custom-marker', image.data);
    map.addLayer({
        'id': 'barinak_layer',
        'type': 'symbol',
        'source': 'barinak_source',
        'layout': {
            'icon-image': 'custom-marker',
            "icon-size": 0.25
        }
    });
    map.setLayoutProperty('barinak_layer', 'visibility', 'none');
    map.on('click', 'barinak_layer', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const name = e.features[0].properties.name;
        let link = `https://harita.istanbul/2d/detail/2124?@=28.97439,41.02751,18.00000&p=45.00000&b=0.00000&suk=&ruk=!&ms=!b281!c&o=!o1&ct=0&duk=${coordinates[1]},${coordinates[0]}&dwk=`;

        new maplibregl.Popup({ className: 'cluster_popup' })
            .setLngLat(coordinates)
            .setHTML(name + `<br/><a href="${link}" target="_blank">Yol Tarifi Al</a>`)
            .addTo(map);
    });
}