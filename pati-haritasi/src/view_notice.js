import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, collection, addDoc, getDocs, query, where, getDoc, Timestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getDownloadURL, getStorage, uploadBytes } from "firebase/storage";
import { getDatabase, push, set, ref, onChildAdded } from "firebase/database";


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
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
let messageListeners = {};


export function viewNotice(noticeId, isAdopted) {
    var collectionName = 'notices';
    var age;

    console.log("viewNotice(): " + noticeId);
    let divViewNotice = document.getElementById('div_view_notice');
    if (divViewNotice) {
        divViewNotice.innerHTML = '';
        divViewNotice.style.display = 'block';
        console.log("Eski element temizlendi");
    } else {
        console.log("Yeni element oluşturuldu");
        divViewNotice = document.createElement('div');
        divViewNotice.id = 'div_view_notice';
        divViewNotice.className = 'div_left_1';
    }
    getDoc(doc(db, collectionName, noticeId)).then((docRef) => {
        let data = docRef.data();
        let viewNoticeTitle = data['title'];
        let viewNoticeDescription = data['description'];
        let location = data['neighborhood'] + "/" + data['district'];
        let animal = data['animal'];
        let breed = data['breed'];
        if (isAdopted) {
            age = data['age'];
        }
        let date = data['creationDate'].toDate();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let formattedDate = `${day < 10 ? '0' : ''}${day}.${month < 10 ? '0' : ''}${month}.${year}`;
        let imageURL = data['imageURL'];
        console.log(imageURL);
        if (!isAdopted) {
            divViewNotice.innerHTML = `
        <h3 class='p_view_notice' >${viewNoticeTitle}</h3>

        <p class='p_view_notice'><span class="highlight">Açıklama:</span> ${viewNoticeDescription}</p>

        <p class='p_view_notice' ><span class="highlight">Tür:</span> ${animal}</p>

        <p class='p_view_notice' ><span class="highlight">Cins:</span> ${breed}</p>

        <p class='p_view_notice' ><span class="highlight">Bölge:</span> ${location}</p>

        <p class='p_view_notice' ><span class="highlight">Yayınlanma Tarihi:</span> ${formattedDate}</p>

        <img src="${imageURL}" alt="Görsel" style="cursor: pointer;" id="notice_img">
        <br>
        `;
        } else {
            divViewNotice.innerHTML = `
        <h3 class='p_view_notice' id='p_view_notice_title'>${viewNoticeTitle}</h3>

        <p class='p_view_notice' ><span class="highlight">Açıklama:</span> ${viewNoticeDescription}</p>

        <p class='p_view_notice' ><span class="highlight">Tür:</span> ${animal}</p>

        <p class='p_view_notice' ><span class="highlight">Cins:</span> ${breed}</p>

        <p class='p_view_notice'><span class="highlight">Yaş:</span> ${age}</p>

        <p class='p_view_notice' ><span class="highlight">Bölge:</span> ${location}</p>

        <p class='p_view_notice' ><span class="highlight">Yayınlanma Tarihi:</span> ${formattedDate}</p>

        <img src="${imageURL}" alt="Görsel" style="cursor: pointer;" id="notice_img">
        <br>
        `;
        }
        document.body.appendChild(divViewNotice);
        document.getElementById('notice_img').addEventListener('click', () => {
            console.log("resme tıklandı");
            var popup_img = document.getElementById('popup_img');
            document.getElementById('div_img_popup_container').style.display = 'flex';
            popup_img.src = imageURL;
        });


        if (data['createdBy'] != auth.currentUser.uid) {
            let sendMessage = document.createElement('button');
            sendMessage.textContent = 'İletişime Geç';
            divViewNotice.appendChild(sendMessage);
            console.log('mesaj gönder butonu oluştu');
            sendMessage.addEventListener('click', () => {
                openChat(auth.currentUser.uid, data['createdBy'], docRef.id);
            })
        }

    });

}
function openChat(user1, user2, notice_id) {
    console.log("openChat()");
    var div_chat_container = document.getElementById('div_chat_container');
    var displayStyle = window.getComputedStyle(div_chat_container).display;
    if (displayStyle == 'none') {
        div_chat_container.style.display = 'flex';
        displayStyle = window.getComputedStyle(div_chat_container).display;
    }

    document.getElementById('message_list').innerHTML = '';
    document.getElementById('input_message').innerHTML = '';
    document.getElementById('h3_chatting_user').innerHTML = '';
    getDoc(doc(db, 'notices', notice_id)).then(noticeSnapshot => {
        if (noticeSnapshot.exists) {
            var noticeData = noticeSnapshot.data();
            var isAdopted = false;
            document.getElementById('p_chat_relevant_notice_title').textContent = noticeData['title'];
            if (noticeData['missing_or_adopted'] == 'adopted') {
                isAdopted = true;
            }
            const goToNoticeButton = document.getElementById('btn_chat_ilana_git');
            const newgoToNoticeButton = goToNoticeButton.cloneNode(true);
            goToNoticeButton.parentNode.replaceChild(newgoToNoticeButton, goToNoticeButton);
            newgoToNoticeButton.addEventListener('click', () => {
                viewNotice(notice_id, isAdopted);
            })
        }
    })

    if (user1 == auth.currentUser.uid) {
        getDoc(doc(db, "users", user2)).then((usersnpshot) => {
            var data = usersnpshot.data();
            document.getElementById('h3_chatting_user').textContent = data['first'] + ' ' + data['last'].charAt(0) + '.';
        });
    } else {
        getDoc(doc(db, "users", user1)).then((usersnpshot) => {
            var data = usersnpshot.data();
            document.getElementById('h3_chatting_user').textContent = data['first'] + ' ' + data['last'].charAt(0) + '.';
        });
    }

    let chat_id = [user1, user2].sort().join('_');

    console.log("chat_id: ", chat_id);
    let messageRef = ref(database, "chats/" + chat_id + "/messages");
    const sendButton = document.getElementById('send_button');
    const newSendButton = sendButton.cloneNode(true);
    sendButton.parentNode.replaceChild(newSendButton, sendButton);
    newSendButton.addEventListener('click', () => {
        let input = document.getElementById('input_message');
        let docRef = doc(db, "users", user1);
        updateDoc(docRef, {
            [`chats_map.${chat_id}`]: notice_id
        }).then(() => {
            console.log("chat arrayi güncellendi");
        }).catch((e) => {
            console.log("Chat arrayi güncellenemedi: " + e);
        });
        let docRef2 = doc(db, "users", user2);
        updateDoc(docRef2, {
            [`chats_map.${chat_id}`]: notice_id
        }).then(() => {
            console.log("chat arrayi güncellendi");
        }).catch((e) => {
            console.log("Chat arrayi güncellenemedi: " + e);
        });

        let newMessageRef = push(messageRef);
        set(newMessageRef, {
            sender: auth.currentUser.uid,
            message: input.value,
            time: Timestamp.now()
        }).then(() => {
            console.log("Mesaj kaydedildi");
            input.value = '';
        }).catch((e) => {
            console.log("Mesaj kaydedilemedi: " + e);
        });
    });
    if (messageListeners[chat_id]) {
        messageListeners[chat_id]();
    }
    messageListeners[chat_id] = onChildAdded(messageRef, (snapshot) => {
        const newMessage = snapshot.val();
        console.log("Yeni mesaj: ", newMessage['message']);
        let li_message = document.createElement('li');
        li_message.textContent = newMessage['message'];
        if (newMessage['sender'] == auth.currentUser.uid) {
            li_message.className = 'myMessage'
        } else {
            li_message.className = 'notMyMessage'
        }
        document.getElementById('message_list').appendChild(li_message);
        document.getElementById('div_messages').scrollTop = document.getElementById('div_messages').scrollHeight;
    });
}
function viewChats() {
    let notice_id;
    document.getElementById('div_my_chats').style.display = 'block';
    let chatList = document.getElementById('ul_my_chats');
    chatList.innerHTML = '';
    getDoc(doc(db, "users", auth.currentUser.uid)).then((docSnapshot) => {
        let data = docSnapshot.data();
        if (data['chats_map']) {
            console.log('chat_map bulundu');
            let chatsMap = new Map(Object.entries(data['chats_map']));
            chatsMap.forEach((value, key) => {
                let [userid1, userid2] = key.split('_');
                let relevant_notice = document.getElementById('p_chat_relevant_notice_title');
                relevant_notice.innerHTML = '';
                getDoc(doc(db, "notices", value)).then(noticeDocSnapshot => {
                    if (noticeDocSnapshot.exists) {
                        notice_id = noticeDocSnapshot.id;
                        var noticeData = noticeDocSnapshot.data();
                        relevant_notice.textContent = noticeData['title'];
                        let chatItem = document.createElement('li');
                        chatItem.className = 'li_notices';
                        let divChatItem = document.createElement('div');
                        divChatItem.className = 'div_notice_list';
                        let p_chatTitle = document.createElement('p');
                        p_chatTitle.className = 'p_noticelist_item';
                        if (auth.currentUser.uid == userid1) {
                            getDoc(doc(db, 'users', userid2)).then((userSnapshot) => {
                                var data = userSnapshot.data();
                                p_chatTitle.textContent = data['first'] + ' ' + data['last'].charAt(0) + '.';
                            })
                        } else {
                            getDoc(doc(db, 'users', userid1)).then((userSnapshot) => {
                                var data = userSnapshot.data();
                                p_chatTitle.textContent = data['first'] + ' ' + data['last'].charAt(0) + '.';
                            })
                        }

                        divChatItem.appendChild(p_chatTitle);
                        chatItem.appendChild(divChatItem);
                        chatList.appendChild(chatItem);
                        document.getElementById('div_my_chats').appendChild(chatList);
                        chatItem.addEventListener('click', () => {
                            document.getElementById('div_my_chats').style.display = 'none';
                            openChat(userid1, userid2, notice_id);
                        });
                    }
                })

            });
        }
    });

}
window.viewChats = viewChats;