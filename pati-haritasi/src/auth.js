import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, collection, addDoc, getDocs, query, where, setDoc, getDoc } from "firebase/firestore";
import { closeDiv } from './main.js'

console.log("auth.js");

const firebaseConfig = {
  apiKey: "",
  authDomain: "web-maplibre.firebaseapp.com",
  projectId: "web-maplibre",
  storageBucket: "web-maplibre.appspot.com",
  messagingSenderId: "",
  appId: "",
  databaseURL: "",
};

const app = initializeApp(firebaseConfig);
let signedIn = false;

const auth = getAuth(app);
const db = getFirestore(app);
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('div_chat_container').style.display = 'none';
    document.getElementById('div_img_popup_container').style.display = 'none';
    document.getElementById('div_search_container').style.display = 'flex';
    console.log("giriş yapıldı");
    document.getElementById("btn_kayip_ilani_ver").style.display = "block";
    document.getElementById("btn_sahiplendir").style.display = "block";
    signedIn = true
    document.getElementById("div_sign").style.display = "none";
    document.getElementById("btn_user").style.display = "block";
    showUserDatas(user.uid);

  } else {
    document.getElementById('div_chat_container').style.display = 'none';
    document.getElementById('div_img_popup_container').style.display = 'none';
    document.getElementById('div_search_container').style.display = 'none';
    document.getElementById("btn_sahiplendir").style.display = "none";
    document.getElementById("btn_kayip_ilani_ver").style.display = "none";
    console.log("Kullanıcı çıkış yaptı");
    signedIn = false;
    closeDiv('div_user_settings');
    document.getElementById("div_sign").style.display = "flex";
    document.getElementById("signIn_email").value = '';
    document.getElementById("signIn_password").value = '';
    document.getElementById("signIn").style.display = "block";
    document.getElementById("signUp").style.display = "block";
    document.getElementById("btn_user").style.display = "none";
    document.getElementById("ilan_olusturma_formu").style.display = "none";
    document.getElementById("div_ilan_olustur").style.display = "none";
    document.getElementById("div_ilan_olusturma_yonergesi").style.display = "none";
    document.getElementById('div_user_settings').style.display = 'none';
    document.getElementById('div_my_notices').style.display = 'none';
    document.getElementById('div_my_chats').style.display = 'none';
    document.getElementById('div_profile_infos').style.display = 'none';
  }
});

let email;
let password;
let first;
let last;
let tel;
let user;
document.getElementById("btn_register").addEventListener("click", () => {

  email = document.getElementById("register_email").value.trim();
  password = document.getElementById("register_password").value.trim();
  first = document.getElementById("register_first").value.trim();
  last = document.getElementById("register_last").value.trim();
  tel = document.getElementById("register_tel").value.trim();
  console.log("mail" + email + " pw: " + password);


  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Kullanıcı kayıt oldu: " + user.uid)
      saveUserDatas(user.uid);
    }).catch((error) => {
      alert("Kayıt Olunamadı: " + error.message + ", " + error.code);
    });
});
async function saveUserDatas(user_id) {
  console.log("saveUserDatas()");
  try {
    const data = {
      user_id: user_id,
      first: first,
      last: last,
      email: email,
      tel: tel,
      password: password
    };
    setDoc(doc(db, 'users', user_id), data).then(() => {
      auth.currentUser.displayName = first + " " + last;
      console.log("Document written with ID: ", docRef.id);
      alert("Kullanıcı başarıyla kaydedildi, artık giriş yapabilirsiniz.")
    })

  } catch (error) {
    alert(error)
  }
}

document.getElementById("btn_signIn").addEventListener("click", () => {
  email = document.getElementById("signIn_email").value.trim();
  password = document.getElementById("signIn_password").value.trim();

  signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
    user = userCredential.user;
    signedIn = true;
    console.log("Giriş Yapıldı: " + user.email);
    document.getElementById("div_sign").style.display = "none";
    document.getElementById("btn_user").style.display = "block";
    showUserDatas(user.uid);
  })
    .catch((error) => {
      alert("Giriş Yapılamadı: " + error.message);
    })
})
async function showUserDatas(user_id) {
  console.log("showUserDatas()");
  if (signedIn) {
    var q = query(collection(db, "users"), where("user_id", "==", user_id));
    var querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        var data = doc.data();
        document.getElementById("p_adSoyad").textContent = data["first"] + " " + data["last"];
      })
    }

  }
}
document.getElementById("btn_signOut").addEventListener("click", () => {
  signOut(auth).then(() => {
    console.log("Başarıyla Çıkış Yapıldı");
  })
    .catch((error) => {
      alert("Çıkış yapılırken bir hata oluştu: " + error.message);
    })

})
document.getElementById('btn_my_profile_infos').addEventListener('click', () => {
  document.getElementById('div_user_settings').style.display = 'none';
  document.getElementById('div_profile_infos').style.display = 'block';
  getDoc(doc(db, "users", auth.currentUser.uid)).then((docSnapshot) => {
    if (docSnapshot.exists) {
      var data = docSnapshot.data();
      document.getElementById('p_info_name_surname').textContent = data['first'] + " " + data['last'];
      document.getElementById('p_info_email').textContent = data['email'];
      document.getElementById('p_info_tel').textContent = data['tel'];
    }
  })
})
document.getElementById('p_forget_password').addEventListener('click', () => {
  document.getElementById('div_reset_password').style.display = 'flex';
});
document.getElementById('btn_info_reset_password').addEventListener('click', () => {
  document.getElementById('div_reset_password').style.display = 'flex';
})


