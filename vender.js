import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBa5JgoDsj-sqSbe2hzuJQwA-SFfAyxvBY",
  authDomain: "resalesneakers-e17cb.firebaseapp.com",
  databaseURL: "https://resalesneakers-e17cb-default-rtdb.firebaseio.com",
  projectId: "resalesneakers-e17cb",
  storageBucket: "resalesneakers-e17cb.appspot.com",
  messagingSenderId: "698715655625",
  appId: "1:698715655625:web:fde7f7a7f2da0037792c18",
  measurementId: "G-WVNMT06HJS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Obter elementos
const form = document.getElementById("sellForm");
const imageInput = document.getElementById("imageInput");

// Esperar confirmação de autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Você precisa estar autenticado para publicar um produto.");
    window.location.href = "log.html";
    return;
  }

  console.log("Utilizador autenticado:", user.uid); // AGORA sim funciona

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validação de imagens
    const files = imageInput.files;
    if (!files.length) {
      alert("Selecione pelo menos uma imagem.");
      return;
    }

    // Validar formulário
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const formData = new FormData(form);
    const urls = [];

    try {
      // Mostrar carregamento
      const btn = form.querySelector("button[type='submit']");
      btn.disabled = true;
      btn.innerText = "A publicar...";

      // Upload de imagens
      for (let i = 0; i < files.length; i++) {
        const storageRef = ref(storage, `produtos/${user.uid}/${Date.now()}-${files[i].name}`);
        await uploadBytes(storageRef, files[i]);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
        // Mostrar imagem carregada publicamente (sem erro de CORS)
        const firebasePreview = document.getElementById("firebaseImagePreview");
        if (firebasePreview) {
          const img = document.createElement("img");
          img.src = url;
          img.alt = "Imagem carregada para o Firebase";
          img.style.maxWidth = "150px";
          img.style.margin = "5px";
          firebasePreview.appendChild(img);
        }
      }

    const produto = {
      nome: formData.get("title"),
      marca: formData.get("brand")?.trim() || "Desconhecida",
      modelo: formData.get("model")?.trim() || "",
      tamanho: formData.get("size") || "",
      condicao: formData.get("condition") || "",
      preco: parseFloat(formData.get("price")) || 0,
      negociavel: formData.get("negotiable") === "yes",
      disponibilidade: formData.get("saleType") || "venda",
      descricao: formData.get("description")?.trim() || "",
      localizacao: formData.get("location")?.trim() || "",
      imagemPrincipal: urls[0],
      imagens: urls,
      visualizacoes: 0,
      favorito: false,
      verificado: false,
      dataCriacao: serverTimestamp(),
      userId: user.uid
    };


      await addDoc(collection(db, "produtos"), produto);

      alert("✅ Produto publicado com sucesso!");
      window.location.href = "meus-produtos.html";

    } catch (error) {
      console.error("Erro ao publicar produto:", error);
      alert("❌ Ocorreu um erro ao tentar publicar o produto. Tente novamente.");
    } finally {
      const btn = form.querySelector("button[type='submit']");
      btn.disabled = false;
      btn.innerText = "Publicar Anúncio";
    }
  });
});
document.querySelectorAll('[data-type]').forEach(option => {
  option.addEventListener('click', function () {
    const saleType = this.getAttribute('data-type');
    document.getElementById("saleTypeInput").value = saleType;
  });
});

