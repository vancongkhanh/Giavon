/* =====================================================================
   FIREBASE-INIT — kết nối tới cùng Firestore/Storage của Cửa hàng Khánh
   Hà (project "khanhha-web"). Trang này chỉ có 1 ô mật khẩu, nhưng bên
   dưới thực chất đăng nhập bằng 1 tài khoản Firebase Auth cố định (xem
   GIAVON_EMAIL trong app.js) — để firestore.rules xác thực được thật sự,
   không phải chỉ ẩn giao diện.
   ===================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBhjgWQChh58f5AQE4bb7Aeh4uQDg4lmNo",
  authDomain: "khanhha-web.firebaseapp.com",
  projectId: "khanhha-web",
  storageBucket: "khanhha-web.firebasestorage.app",
  messagingSenderId: "430510074863",
  appId: "1:430510074863:web:2fc0dfa891c15fe2bda41a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

let storageModulePromise = null;
export function getStorageLazy() {
  if (!storageModulePromise) {
    storageModulePromise = import('https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js')
      .then(function (mod) {
        return {
          storage: mod.getStorage(app),
          ref: mod.ref,
          uploadBytes: mod.uploadBytes,
          getDownloadURL: mod.getDownloadURL
        };
      });
  }
  return storageModulePromise;
}
