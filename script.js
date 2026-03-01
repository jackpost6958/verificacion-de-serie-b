const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("status-msg");

const rangos = {
  10: [[67250001, 67700000], [69050001, 69500000], [69500001, 69950000], [69950001, 70400000], [70400001, 70850000], [70850001, 71300000], [76310012, 85139995], [86400001, 86850000], [90900001, 91350000], [91800001, 92250000]],
  20: [[87280145, 91646549], [96650001, 97100000], [99800001, 100250000], [100250001, 100700000], [109250001, 109700000], [110600001, 111050000], [111050001, 111500000], [111950001, 112400000], [112400001, 112850000], [112850001, 113300000], [114200001, 114650000], [114650001, 115100000], [115100001, 115550000], [118700001, 119150000], [119150001, 119600000], [120500001, 120950000]],
  50: [[77100001, 77550000], [78000001, 78450000], [78900001, 96350000], [96350001, 96800000], [96800001, 97250000], [98150001, 98600000], [104900001, 105350000], [105350001, 105800000], [106700001, 107150000], [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]]
};

let scanning = false;
let lecturasConfirmadas = {}; // Para el sistema de votos

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } 
    });
    video.srcObject = stream;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    lecturasConfirmadas = {}; 
    procesarCiclo();
  } catch (e) { alert("Error de cámara. Use HTTPS."); }
};

async function procesarCiclo() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  
  // Aumentamos la resolución del canvas de procesamiento
  canvas.width = 600; 
  canvas.height = 120;

  // Dibujamos el área central con un zoom ligero
  ctx.drawImage(video, vW * 0.15, vH * 0.42, vW * 0.7, vH * 0.15, 0, 0, 600, 120);

  // --- PROCESAMIENTO DE IMAGEN AVANZADO ---
  let imgData = ctx.getImageData(0, 0, 600, 120);
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Escala de grises pesada
    let g = d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11;
    // Umbral de binarización agresivo (ajustable)
    let b = g < 130 ? 0 : 255; 
    d[i] = d[i+1] = d[i+2] = b;
  }
  ctx.putImageData(imgData, 0, 0);

  // OCR con configuración de "solo números y letras mayúsculas"
  const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  });

  const limpio = text.replace(/[^0-9A-Z]/g, "");
  const match = limpio.match(/(\d{7,9})([AB])/);

  if (match) {
    const serie = match[1] + match[2];
    
    // SISTEMA DE VOTOS: Requiere que la misma serie aparezca 3 veces
    lecturasConfirmadas[serie] = (lecturasConfirmadas[serie] || 0) + 1;
    statusMsg.innerText = `Confirmando... (${lecturasConfirmadas[serie]}/3)`;

    if (lecturasConfirmadas[serie] >= 3) {
      finalizarEscaneo(serie, parseInt(match[1]), match[2]);
      return;
    }
  }

  // Reintento rápido si no hay coincidencia sólida
  setTimeout(procesarCiclo, 300);
}

function finalizarEscaneo(serie, num, letra) {
  scanning = false;
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  
  const denom = document.getElementById("denominacion").value;
  let esIlegal = (letra === "B") && rangos[denom].some(([min, max]) => num >= min && num <= max);

  alert(`${esIlegal ? '⚠️ SERIE ILEGAL' : '✅ SERIE LEGAL'}\n\nSerie: ${serie}\nValor: Bs. ${denom}`);
  location.reload();
}
