import { auth, db, storage } from './firebase-config.js';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

let uploadedImages = [];
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("imagePreviewContainer");
const progressBar = document.getElementById("progressFill");
const progressContainer = document.getElementById("progressContainer");
const progressText = document.getElementById("progressText");

function showImagePreview(files) {
  preview.innerHTML = '';
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.width = "100px";
      img.style.height = "100px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "5px";
      img.style.margin = "5px";
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 6) {
    alert("Você só pode enviar no máximo 6 imagens.");
    imageInput.value = "";
    return;
  }
  uploadedImages = files;
  showImagePreview(files);
});

function uploadImages(userId) {
  progressContainer.classList.remove("d-none");
  const uploadPromises = uploadedImages.map((file, index) => {
    const filePath = `produtos/${userId}/${Date.now()}_${index}_${file.name}`;
    const fileRef = storageRef(storage, filePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `A carregar imagens... ${Math.floor(progress)}%`;
        },
        (error) => {
          console.error('Erro ao fazer upload da imagem:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(fileRef);
            resolve(url);
          } catch (e) {
            console.error('Erro ao obter downloadURL:', e);
            reject(e);
          }
        }
      );
    });
  });
  return Promise.all(uploadPromises);
}

let user = null;

onAuthStateChanged(auth, (u) => {
  if (u) {
    user = u;
  } else {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "/resellsneakers/index.html";
  }

  const form = document.getElementById("sellForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Você precisa estar logado para publicar.");
      return;
    }

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    if (!uploadedImages.length) {
      alert("Por favor selecione ao menos uma imagem.");
      return;
    }

    form.classList.add("was-validated");

    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.textContent = "A publicar...";

    try {
      const urls = await uploadImages(user.uid);
      const formData = new FormData(form);

      // Se não houver imagens, adicionar banners antigos
      let imagensFinal = urls.length > 0 ? urls : [
        'images/banner1.png',
        'images/banner2.png',
        'images/banner3.png'
      ];

      // Garantir que todos os campos obrigatórios estão preenchidos corretamente
      const preco = parseFloat(formData.get("price"));
      const produto = {
        nome: formData.get("title") || "Produto sem nome",
        marca: formData.get("brand") || "Desconhecida",
        modelo: formData.get("model") || "",
        tamanho: formData.get("size") || "",
        condicao: formData.get("condition") || "",
        preco: isNaN(preco) ? 0 : preco,
        negociavel: formData.get("negotiable") === "yes" || formData.get("negotiable") === "Sim",
        disponibilidade: formData.get("saleType") || "venda",
        descricao: formData.get("description") || "",
        localizacao: formData.get("location") || "",
        imagemPrincipal: imagensFinal[0],
        imagens: imagensFinal,
        visualizacoes: 0,
        favorito: false,
        verificado: false,
        dataCriacao: serverTimestamp(),
        userId: user.uid,
        vendedorId: user.uid,
        vendedor: user.uid // <- campo obrigatório para as regras
      };
      console.log("Produto a ser publicado:", produto);
      await addDoc(collection(db, "produtos"), produto);

      // Notificar seguidores
      try {
        const seguidoresSnap = await getDocs(query(collection(db, 'seguidores'), where('userId', '==', user.uid)));
        for (const docSnap of seguidoresSnap.docs) {
          const seguidorId = docSnap.data().seguidorId;
          await addDoc(collection(db, 'notificacoes'), {
            userId: seguidorId,
            mensagem: `Novo produto publicado por ${user.displayName || 'um vendedor que você segue'}!`,
            produtoNome: produto.nome,
            produtoId: null, // pode ser preenchido se quiser buscar o ID do produto
            vendedorId: user.uid,
            lida: false,
            timestamp: new Date()
          });
        }
      } catch (e) {
        console.warn('Não foi possível notificar seguidores:', e);
      }

      alert("✅ Produto publicado com sucesso!");
      window.location.href = "meu-perfil.html";
    } catch (err) {
      console.error("Erro ao publicar produto:", err);
      alert(`❌ Erro ao publicar produto.\n${err && err.message ? err.message : err}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "Publicar";
    }
  });
});
