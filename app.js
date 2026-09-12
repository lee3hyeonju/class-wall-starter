import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  limit,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2yOp5b52HLCo0LTKZWeGCw6ZFdVJOlWU",
  authDomain: "test-class-31357.firebaseapp.com",
  projectId: "test-class-31357",
  storageBucket: "test-class-31357.firebasestorage.app",
  messagingSenderId: "727597155281",
  appId: "1:727597155281:web:1b6e321c44d0927f5396f0",
  measurementId: "G-70HWR0KJ8L",
};

const wall = document.getElementById("wall");
const input = document.getElementById("input");
const userArea = document.getElementById("userArea");

const localKey = "memo-board:fallback:v1";
let db = null;
let isReady = false;
let isFirestoreMode = true;
let localMemos = [];
let unsub = null;

function setStatus(message) {
  if (userArea) userArea.textContent = message;
}

function saveLocalMemos(memos) {
  localStorage.setItem(localKey, JSON.stringify(memos));
}

function loadLocalMemos() {
  try {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function makeMemoNode(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "삭제";
  del.type = "button";
  del.addEventListener("click", async () => {
    if (!memo.id) return;

    if (isFirestoreMode && db) {
      try {
        await deleteDoc(doc(db, "memos", memo.id));
      } catch (error) {
        console.error("Firestore delete failed:", error);
        setStatus(`삭제 실패 (${error.code || "unknown"}). 다시 시도해 주세요.`);
      }
    } else {
      localMemos = localMemos.filter((item) => item.id !== memo.id);
      renderLocalMemos();
      saveLocalMemos(localMemos);
    }
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text ?? "";
  div.appendChild(span);

  return div;
}

function renderLocalMemos() {
  if (!wall) return;
  wall.innerHTML = "";

  const list = localMemos.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  list.forEach((memo) => {
    wall.appendChild(makeMemoNode({ ...memo, id: memo.id || `local-${memo.createdAt}` }));
  });
}

function renderFirestore(snapshotDocs) {
  if (!wall) return;
  wall.innerHTML = "";
  snapshotDocs.forEach((memoDoc) => {
    wall.appendChild(makeMemoNode({ id: memoDoc.id, ...memoDoc.data() }));
  });
}

async function initFirestore() {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        setStatus("로그인 처리 중...");
        signInAnonymously(auth).catch((error) => {
          console.error("anonymous sign-in failed:", error);
          switchToLocal("로그인 실패로 로컬 보관 모드로 전환: " + (error.code || "unknown"));
        });
      } else {
        setStatus("Firebase 로그인: 게스트(익명)");
        startFirestoreListener();
      }
    });
  } catch (error) {
    console.error("Firebase init failed:", error);
    switchToLocal("Firebase 초기화 실패로 로컬 보관 모드로 전환: " + (error.message || error.code));
  }
}

function startFirestoreListener() {
  if (!db) return;

  if (unsub) {
    unsub();
    unsub = null;
  }

  const memoCol = collection(db, "memos");
  const q = query(memoCol, orderBy("createdAt"), limit(200));

  unsub = onSnapshot(
    q,
    (snapshot) => {
      isFirestoreMode = true;
      isReady = true;
      setStatus("Firebase 준비 완료");
      renderFirestore(snapshot.docs);
    },
    (error) => {
      console.error("onSnapshot failed:", error);
      switchToLocal(`Firestore 구독 실패 (${error.code || error.message})로 로컬 모드로 전환`);
    }
  );
}

function switchToLocal(reason) {
  isFirestoreMode = false;
  isReady = true;
  localMemos = loadLocalMemos();
  renderLocalMemos();
  setStatus(reason);
}

async function saveMemo(text) {
  if (!text) return;

  if (!isReady) {
    setStatus("아직 Firebase 준비가 안 되어 큐에 저장합니다.");
  }

  const payload = {
    text,
    createdAt: Date.now(),
  };

  if (isFirestoreMode && db) {
    await addDoc(collection(db, "memos"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return;
  }

  localMemos.push(payload);
  saveLocalMemos(localMemos);
  renderLocalMemos();
}

if (wall && input) {
  renderLocalMemos();
}

input?.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;

  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const oldText = input.value;
  input.value = "";

  try {
    await saveMemo(text);
    setStatus(isFirestoreMode ? "저장 완료" : "로컬 임시 저장(네트워크 복구 시 동기화 필요)");
  } catch (error) {
    console.error("save failed:", error);
    input.value = oldText;
    setStatus(`저장 실패 (${error.code || error.message})`);
  }

  input.focus();
});

if (input) {
  input.focus();
}

setStatus("Firebase 연결 준비 중...");
initFirestore();
