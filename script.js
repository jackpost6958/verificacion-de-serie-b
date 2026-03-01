const scanBtn = document.getElementById("scanBtn");
const captureBtn = document.getElementById("captureBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");


const rangos10 = [
  [67250001, 67700000],
  [69050001, 69500000],
  [69500001, 69950000],
  [69950001, 70400000],
  [70400001, 70850000],
  [70850001, 71300000],
  [76310012, 85139995],
  [86400001, 86850000],
  [90900001, 91350000],
  [91800001, 92250000]
];

const rangos20 = [
  [87280145, 91646549],
  [96650001, 97100000],
  [99800001, 100250000],
  [100250001, 100700000],
  [109250001, 109700000],
  [110600001, 111050000],
  [111050001, 111500000],
  [111950001, 112400000],
  [112400001, 112850000],
  [112850001, 113300000],
  [114200001, 114650000],
  [114650001, 115100000],
  [115100001, 115550000],
  [118700001, 119150000],
  [119150001, 119600000],
  [120500001, 120950000]
];

const rangos50 = [
  [77100001, 77550000],
  [78000001, 78450000],
  [78900001, 96350000],
  [96350001, 96800000],
  [96800001, 97250000],
  [98150001, 98600000],
  [104900001, 105350000],
  [105350001, 105800000],
  [106700001, 107150000],
  [107600001, 108050000],
  [108050001, 108500000],
  [109400001, 109850000]
];

/* ========================= */

scanBtn.addEventListener("click", iniciarCamara);
captureBtn.addEventListener("click", capturarImagen);

async function iniciarCamara() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  });

  video.srcObject = stream;
  video.hidden = false;
  scanBtn.hidden = true;
  captureBtn.hidden = false;
}

function capturarImagen() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // 🔥 SOLO LA FRANJA SUPERIOR
  const cropX = 0;
  const cropY = 0;
  const cropW = vw;
  const cropH = Math.floor(vh * 0.25);

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(
    video,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );

  video.srcObject.getTracks().forEach(track => track.stop());
  video.hidden = true;
  captureBtn.hidden = true;

  preprocesarImagen();
}

function preprocesarImagen() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
    d[i] = d[i+1] = d[i+2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  reconocerTexto();
}

async function reconocerTexto() {
  const { data } = await Tesseract.recognize(
    canvas,
    "eng",
    { logger: () => {} }
  );

  console.log("OCR RAW:", data.text);

  const limpio = normalizarTextoOCR(data.text);

  console.log("OCR NORMALIZADO:", limpio);

  // Buscar bloques largos de números
  const numeros = limpio.match(/\d+/g) || [];

  // Buscar letra final
  const letra = limpio.match(/[A-Z]/g)?.pop();

  console.log("NUMEROS DETECTADOS:", numeros);
  console.log("LETRA DETECTADA:", letra);

  // Unir números hasta llegar a 9 dígitos
  let serieNumerica = "";
  for (const bloque of numeros) {
    serieNumerica += bloque;
    if (serieNumerica.length >= 9) break;
  }

  serieNumerica = serieNumerica.slice(0, 9);

  if (serieNumerica.length !== 9 || !letra) {
    alert("❌ No se detectó la serie.\nIntenta más cerca y recto.");
    resetear();
    return;
  }

  const serieFinal = serieNumerica + letra;

  console.log("SERIE FINAL:", serieFinal);

  preguntarBillete(serieFinal);
}

function normalizarTextoOCR(texto) {
  return texto
    .toUpperCase()
    .replace(/I/g, "1")
    .replace(/O/g, "0")
    .replace(/[^0-9A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estaEnRango(numero, rangos) {
  return rangos.some(([min, max]) => numero >= min && numero <= max);
}

function validarSerie(serie, billete) {
  if (!serie.endsWith("B")) return true;

  const numero = parseInt(serie.slice(0, -1));

  if (billete === 10) return !estaEnRango(numero, rangos10);
  if (billete === 20) return !estaEnRango(numero, rangos20);
  if (billete === 50) return !estaEnRango(numero, rangos50);

  return false;
}

function resetear() {
  scanBtn.hidden = false;
}



