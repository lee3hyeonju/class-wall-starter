import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const wall = document.getElementById("wall");
const input = document.getElementById("input");
const memosCol = collection(db, "memos");

function render(memos) {
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
  del.textContent = "횞";
  del.addEventListener("click", async () => {
    await deleteDoc(doc(db, "memos", memoDoc.id));
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = data.text ?? "";
  div.appendChild(span);

  return div;
}

async function addMemo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(memosCol, {
    text: trimmed,
    createdAt: Date.now(),
  });
}

const q = query(memosCol, orderBy("createdAt"));
onSnapshot(
  q,
  (snapshot) => {
    render(snapshot.docs);
  },
  (error) => {
    console.error("Firestore subscription error:", error);
  }
);

input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    input.value = "";
    await addMemo(text);
    input.focus();
  }
});

input.focus();
