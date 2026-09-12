import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2yOp5b52HLCo0LTKZWeGCw6ZFdVJOlWU",
  authDomain: "test-class-31357.firebaseapp.com",
  projectId: "test-class-31357",
  storageBucket: "test-class-31357.firebasestorage.app",
  messagingSenderId: "727597155281",
  appId: "1:727597155281:web:1b6e321c44d0927f5396f0",
  measurementId: "G-70HWR0KJ8L",
};

const userArea = document.getElementById("userArea");
const wall = document.getElementById("wall");
const input = document.getElementById("input");

function setStatus(message) {
  if (userArea) userArea.textContent = message;
}

let db = null;
let ready = false;

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setStatus(`로그인 상태: ${user.uid ? "게스트(익명)" : "게스트"} (${user.uid ? user.uid.slice(0, 6) : "-"})`);
      bindFirestoreListeners();
      ready = true;
    } else {
      setStatus("로그인 상태: 비로그인");
      signInAnonymously(auth)
        .then(() => {
          setStatus("로그인 상태: 게스트");
        })
        .catch((error) => {
          ready = false;
          console.error("익명 로그인 실패:", error);
          setStatus("로그인 실패: Firestore 쓰기 권한이 막혀 있을 수 있습니다. 브라우저 콘솔을 확인하세요.");
        });
    }
  });
} catch (error) {
  console.error("Firebase 초기화 실패:", error);
  setStatus("Firebase 초기화 실패: 네트워크/SDK 버전 또는 설정을 확인해 주세요.");
}

function render(memos) {
  if (!wall) return;
  wall.innerHTML = "";

  memos.forEach((memoDoc) => {
    wall.appendChild(makeMemo(memoDoc));
  });
}

function makeMemo(memoDoc) {
  const data = memoDoc.data();

  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "삭제";
  del.addEventListener("click", async () => {
    if (!db) return;

    try {
      await deleteDoc(doc(db, "memos", memoDoc.id));
    } catch (error) {
      console.error("메모 삭제 실패:", error);
      setStatus("메모 삭제 실패: 권한 또는 규칙을 확인해 주세요.");
    }
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = data?.text ?? "";
  div.appendChild(span);

  return div;
}

function bindFirestoreListeners() {
  if (!db) return;

  const memosCol = collection(db, "memos");
  const q = query(memosCol, orderBy("createdAt"));

  onSnapshot(
    q,
    (snapshot) => {
      render(snapshot.docs);
      setStatus(userArea?.textContent.includes("쓰기") ? userArea.textContent : "로그인 상태: 게스트 (Firestore 연결 중)");
    },
    (error) => {
      console.error("Firestore 구독 에러:", error);
      setStatus(`메모 불러오기 실패 (${error.code || error.message}). Firestore 규칙/인덱스/네트워크를 확인해 주세요.`);
    }
  );
}

async function addMemo(text) {
  if (!db || !ready) {
    throw new Error("Firebase가 준비되지 않았습니다.");
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "memos"), {
    text: trimmed,
    createdAt: Date.now(),
  });
}

input?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    try {
      await addMemo(text);
      input.value = "";
      setStatus("저장 완료");
    } catch (error) {
      console.error("메모 저장 실패:", error);
      setStatus(`저장 실패: ${error.code || error.message}`);
    }

    input.focus();
  }
});

if (input) {
  input.focus();
  setStatus("초기화 중: Firestore 인증/연결 확인 중...");
}
