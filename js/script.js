
"use strict";

// ========================================
// PAOW'S STICKERPACK LAB ★
// VERSION 1.3
// owa, este es el coso que hace los stickers
// ========================================


// ========================================
// 1. ELEMENTOS DEL HTML
// ========================================

const inputImagenes = document.getElementById("imagenes");
const zonaSubida = document.getElementById("zonaSubida");
const preview = document.getElementById("preview");
const contador = document.getElementById("contador");
const botonGenerar = document.getElementById("generar");
const estado = document.getElementById("estado");

const inputNombre = document.getElementById("nombre");
const inputAutor = document.getElementById("autor");

const progresoContenedor =
  document.getElementById("progresoContenedor");

const progresoBarra =
  document.getElementById("progresoBarra");


// ========================================
// 2. CONFIGURACION
// ========================================

const MAX_STICKERS = 30;
const MIN_STICKERS = 3;

const MAX_MB = 10;

const TAMANO_STICKER = 512;
const TAMANO_PORTADA = 96;

const LIMITE_WEBP = 100 * 1024;
const LIMITE_PORTADA = 50 * 1024;

const tiposPermitidos = [
  "image/png",
  "image/jpeg",
  "image/webp"
];

let stickers = [];
let generando = false;


// ========================================
// 3. MENSAJES DEL GENERADOR
// ========================================

// aca estan los textos para cambiarlos
// sin tener que buscarlos por todo el codigo

const mensajes = {
  vacio: "aca no hay nada todavia",

  minimo: "pon al menos 3 imagenes, oe",

  listo: "ya estan, ahora dale al boton ese",

  generando: "convirtiendo cositas...",

  portada: "haciendo la portata...",

  empaquetando: "metiendo todo en un paquetito...",

  completado: "ya quedo ihhhh :D, revisa tus descargas",

  error: "ouh, algo salio mal :c",

  boton: "HACER MI PAQUETITO ↓",

  procesando: "HACIENDO EL PAQUETITO..."
};


// ========================================
// 4. SELECCIONAR IMAGENES
// ========================================

// cuando alguien selecciona sus imagenes

inputImagenes.addEventListener("change", (evento) => {
  agregarImagenes(evento.target.files);

  inputImagenes.value = "";
});


// tambien pueden arrastrarlas

zonaSubida.addEventListener("dragover", (evento) => {
  evento.preventDefault();

  if (!generando) {
    zonaSubida.classList.add("arrastrando");
  }
});

zonaSubida.addEventListener("dragleave", () => {
  zonaSubida.classList.remove("arrastrando");
});

zonaSubida.addEventListener("drop", (evento) => {
  evento.preventDefault();

  zonaSubida.classList.remove("arrastrando");

  agregarImagenes(evento.dataTransfer.files);
});


// ========================================
// 5. AGREGAR IMAGENES
// ========================================

function agregarImagenes(archivos) {
  if (generando) return;

  let rechazados = 0;
  let excedentes = 0;

  for (const archivo of archivos) {

    // maximo 30 stickers
    if (stickers.length >= MAX_STICKERS) {
      excedentes++;
      continue;
    }

    // verificar formato y tamaño
    if (
      !tiposPermitidos.includes(archivo.type) ||
      archivo.size > MAX_MB * 1024 * 1024
    ) {
      rechazados++;
      continue;
    }

    // crear una URL temporal para mostrar la imagen
    const url = URL.createObjectURL(archivo);

    stickers.push({
      id: crypto.randomUUID(),
      archivo,
      url
    });
  }

  mostrarStickers();

  if (rechazados > 0 || excedentes > 0) {
    estado.textContent =
      "ouh, algunas imagenes no se pudieron agregar. " +
      "usa PNG, JPG o WEBP de hasta 10 MB " +
      "y recuerda que solo caben 30.";
  }
}


// ========================================
// 6. MOSTRAR LOS STICKERS
// ========================================

function mostrarStickers() {
  preview.replaceChildren();

  if (stickers.length === 0) {

    const mensaje = document.createElement("p");

    mensaje.className = "mensaje-vacio";
    mensaje.textContent = mensajes.vacio;

    preview.appendChild(mensaje);
  }

  stickers.forEach((sticker) => {

    // crear tarjeta
    const tarjeta = document.createElement("div");
    tarjeta.className = "sticker";

    // imagen
    const imagen = document.createElement("img");

    imagen.src = sticker.url;
    imagen.alt = sticker.archivo.name;

    // boton para quitarla
    const eliminar = document.createElement("button");

    eliminar.className = "eliminar";
    eliminar.type = "button";
    eliminar.textContent = "×";
    eliminar.disabled = generando;

    eliminar.setAttribute(
      "aria-label",
      `Eliminar ${sticker.archivo.name}`
    );

    eliminar.addEventListener("click", () => {
      eliminarSticker(sticker.id);
    });

    tarjeta.append(imagen, eliminar);

    preview.appendChild(tarjeta);
  });

  contador.textContent =
    `${stickers.length} / ${MAX_STICKERS}`;

  actualizarBoton();

  if (!generando) {
    estado.textContent =
      stickers.length < MIN_STICKERS
        ? mensajes.minimo
        : mensajes.listo;
  }
}


// ========================================
// 7. ELIMINAR STICKERS
// ========================================

function eliminarSticker(id) {
  if (generando) return;

  const sticker = stickers.find(
    (item) => item.id === id
  );

  if (!sticker) return;

  // liberar memoria
  URL.revokeObjectURL(sticker.url);

  stickers = stickers.filter(
    (item) => item.id !== id
  );

  mostrarStickers();
}


// ========================================
// 8. PREPARAR EL CANVAS
// ========================================

// el canvas es donde acomodamos cada imagen
// para convertirla a sticker

function dibujarImagen(imagen, tamano) {
  const canvas = document.createElement("canvas");

  canvas.width = tamano;
  canvas.height = tamano;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("no se pudo crear el canvas");
  }

  // calcular el tamaño sin deformar la imagen
  const escala = Math.min(
    tamano / imagen.width,
    tamano / imagen.height
  );

  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;

  // centrarla
  const x = (tamano - ancho) / 2;
  const y = (tamano - alto) / 2;

  // fondo transparente
  ctx.clearRect(0, 0, tamano, tamano);

  ctx.drawImage(
    imagen,
    x,
    y,
    ancho,
    alto
  );

  return canvas;
}


// ========================================
// 9. CONVERTIR CANVAS A ARCHIVO
// ========================================

function canvasABlob(canvas, tipo, calidad) {
  return new Promise((resolve, reject) => {

    canvas.toBlob(
      (blob) => {

        if (!blob || blob.type !== tipo) {
          reject(
            new Error(
              `no se pudo crear el archivo ${tipo}`
            )
          );

          return;
        }

        resolve(blob);
      },
      tipo,
      calidad
    );
  });
}


// ========================================
// 10. CONVERTIR IMAGEN A WEBP
// ========================================

// aqui sucede la magia (bueno, mas o menos)

async function convertirAWebP(archivo) {
  const imagen = await createImageBitmap(archivo);

  try {
    const canvas = dibujarImagen(
      imagen,
      TAMANO_STICKER
    );

    // probar distintas calidades de compresion
    for (let paso = 9; paso >= 1; paso--) {

      const calidad = paso / 10;

      const blob = await canvasABlob(
        canvas,
        "image/webp",
        calidad
      );

      // debe pesar maximo 100 KB
      if (blob.size <= LIMITE_WEBP) {
        return blob;
      }
    }

    throw new Error(
      `no pude comprimir "${archivo.name}" a 100 KB :c`
    );

  } finally {
    imagen.close();
  }
}


// ========================================
// 11. CREAR LA PORTADITA
// ========================================

// usamos la primera imagen como portada

async function crearPortada(archivo) {
  const imagen = await createImageBitmap(archivo);

  try {
    const canvas = dibujarImagen(
      imagen,
      TAMANO_PORTADA
    );

    const blob = await canvasABlob(
      canvas,
      "image/png"
    );

    if (blob.size > LIMITE_PORTADA) {
      throw new Error(
        "la portadita pesa demasiado :c"
      );
    }

    return blob;

  } finally {
    imagen.close();
  }
}


// ========================================
// 12. BARRA DE PROGRESO
// ========================================

function actualizarProgreso(porcentaje) {
  const valor = Math.max(
    0,
    Math.min(100, Math.round(porcentaje))
  );

  // si no existe la barra, no detenemos nada
  if (!progresoContenedor || !progresoBarra) {
    return;
  }

  progresoContenedor.hidden = false;

  progresoBarra.style.width = `${valor}%`;

  progresoBarra.setAttribute(
    "aria-valuenow",
    String(valor)
  );
}

function ocultarProgreso() {

  if (progresoContenedor) {
    progresoContenedor.hidden = true;
  }

  if (progresoBarra) {
    progresoBarra.style.width = "0%";

    progresoBarra.setAttribute(
      "aria-valuenow",
      "0"
    );
  }
}


// ========================================
// 13. CONTROLAR EL BOTON
// ========================================

function actualizarBoton() {
  botonGenerar.disabled =
    generando || stickers.length < MIN_STICKERS;
}


// ========================================
// 14. GENERAR EL PAQUETITO
// ========================================

async function generarPaquete() {

  // evitar que se generen varios a la vez
  if (generando) return;

  // verificar cantidad de imagenes
  if (
    stickers.length < MIN_STICKERS ||
    stickers.length > MAX_STICKERS
  ) {
    estado.textContent = mensajes.minimo;
    return;
  }

  // verificar que JSZip este disponible
  if (typeof JSZip === "undefined") {
    estado.textContent =
      "ouh, no pude cargar JSZip :c " +
      "revisa tu conexion a internet";
    return;
  }

  const nombre =
    inputNombre.value.trim() || "Mis Stickers";

  const autor =
    inputAutor.value.trim() || "Paow's StickerPack Lab";

  // bloquear botones mientras trabajamos
  generando = true;

  botonGenerar.disabled = true;
  inputImagenes.disabled = true;

  botonGenerar.textContent = mensajes.procesando;

  mostrarStickers();

  ocultarProgreso();
  actualizarProgreso(0);

  try {

    // crear archivo comprimido
    const zip = new JSZip();

    // datos del paquete
    zip.file("title.txt", nombre);
    zip.file("author.txt", autor);

    // convertir todas las imagenes
    for (let i = 0; i < stickers.length; i++) {

      const sticker = stickers[i];

      estado.textContent =
        `${mensajes.generando} ${i + 1}/${stickers.length}`;

      const webp = await convertirAWebP(
        sticker.archivo
      );

      const numero = String(i + 1).padStart(
        2,
        "0"
      );

      zip.file(
        `sticker_${numero}.webp`,
        webp
      );

      // actualizar barra dentro del ciclo
      actualizarProgreso(
        ((i + 1) / stickers.length) * 90
      );
    }

    // crear portada
    estado.textContent = mensajes.portada;

    const portada = await crearPortada(
      stickers[0].archivo
    );

    zip.file("cover.png", portada);

    actualizarProgreso(95);

    // empaquetar todo
    estado.textContent = mensajes.empaquetando;

    const resultado = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6
      }
    });

    actualizarProgreso(100);

    // nombre seguro para descargar
    const nombreArchivo = nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "mis_stickers";

    // descargar .wastickers
    const url = URL.createObjectURL(resultado);

    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `${nombreArchivo}.wastickers`;

    document.body.appendChild(enlace);

    enlace.click();
    enlace.remove();

    // liberar memoria despues de la descarga
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);

    estado.textContent = mensajes.completado;

  } catch (error) {

    console.error(
      "Error en StickerPack Lab:",
      error
    );

    estado.textContent =
      `${mensajes.error} ${error.message}`;

    ocultarProgreso();

  } finally {

    // desbloquear los controles
    generando = false;

    inputImagenes.disabled = false;

    botonGenerar.textContent = mensajes.boton;

    actualizarBoton();

    // habilitar otra vez los botones de eliminar
    document.querySelectorAll(".eliminar").forEach(
      (boton) => {
        boton.disabled = false;
      }
    );
  }
}


// ========================================
// 15. INICIAR EL GENERADOR
// ========================================

botonGenerar.addEventListener(
  "click",
  generarPaquete
);

// estado inicial
ocultarProgreso();
mostrarStickers();

// fin del coso, owa ★
