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
let historialLecturas = []; 

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1920 } } 
    });
    video.srcObject = stream;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    procesarEscaneo();
  } catch (e) { alert("Error de cámara."); }
};

async function procesarEscaneo() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  
  // Aumentamos el tamaño del canvas para que los números sean grandes para la IA
  canvas.width = 900; 
  canvas.height = 180;

  // Dibujamos con un margen extra a la izquierda para NO perder el primer dígito
  ctx.drawImage(video, vW * 0.05, vH * 0.4, vW * 0.9, vH * 0.2, 0, 0, 900, 180);

  // --- FILTRO DE ALTA DEFINICIÓN ---
  let imgData = ctx.getImageData(0, 0, 900, 180);
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Calculamos el brillo pero le damos peso al canal rojo (los billetes de 20 son rojos)
    // para ignorar el fondo y detectar solo la tinta negra.
    let brightness = (d[i] * 0.2 + d[i+1] * 0.7 + d[i+2] * 0.1);
    let v = brightness < 115 ? 0 : 255; // Tinta negra -> 0, Fondo -> 255
    d[i] = d[i+1] = d[i+2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  // Usamos Tesseract con el motor más moderno (LSTM) y whitelist
  const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
    tessedit_char_whitelist: '0123456789AB',
    tessedit_pageseg_mode: '7' // Tratar la imagen como una sola línea de texto
  });

  const limpio = text.toUpperCase().replace(/[^0-9AB]/g, "");
  
  // Expresión regular que obliga a tener exactamente 9 números y una letra
  const match = limpio.match(/(\d{9})([AB])/);

  if (match) {
    const serie = match[1] + match[2];
    historialLecturas.push(serie);
    statusMsg.innerText = `Validando serie: ${serie}`;

    // Si la misma serie aparece 2 veces en el historial de frames, la damos por válida
    const coincidencias = historialLecturas.filter(s => s === serie).length;
    if (coincidencias >= 2) {
      verificarBaseDeDatos(serie, parseInt(match[1]), match[2]);
      return;
    }
  }

  // Si el historial crece mucho y no hay coincidencias, lo limpiamos para no saturar
  if (historialLecturas.length > 10) historialLecturas.shift();

  setTimeout(procesarEscaneo, 250);
}

function verificarBaseDeDatos(serie, num, letra) {
  scanning = false;
  const denom = document.getElementById("denominacion").value;
  let esIlegal = (letra === "B") && rangos[denom].some(([min, max]) => num >= min && num <= max);

  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

  alert(`${esIlegal ? '⚠️ SERIE REGISTRADA COMO ILEGAL' : '✅ SERIE SIN REPORTES'}\n\nSerie detectada: ${serie}\nValor: Bs. ${denom}`);
  location.reload();
}
