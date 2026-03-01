const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("status-msg");

// Rangos de billetes reportados como ilegales
const rangosIlegales = {
  10: [[67250001, 67700000], [69050001, 69500000], [69500001, 69950000], [69950001, 70400000], [70400001, 70850000], [70850001, 71300000], [76310012, 85139995], [86400001, 86850000], [90900001, 91350000], [91800001, 92250000]],
  20: [[87280145, 91646549], [96650001, 97100000], [99800001, 100250000], [100250001, 100700000], [109250001, 109700000], [110600001, 111050000], [111050001, 111500000], [111950001, 112400000], [112400001, 112850000], [112850001, 113300000], [114200001, 114650000], [114650001, 115100000], [115100001, 115550000], [118700001, 119150000], [119150001, 119600000], [120500001, 120950000]],
  50: [[77100001, 77550000], [78000001, 78450000], [78900001, 96350000], [96350001, 96800000], [96800001, 97250000], [98150001, 98600000], [104900001, 105350000], [105350001, 105800000], [106700001, 107150000], [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]]
};

let scanning = false;

document.getElementById("scanBtn").onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment", focusMode: "continuous" } 
  });
  video.srcObject = stream;
  document.getElementById("ui-container").hidden = true;
  document.getElementById("scanner-container").hidden = false;
  scanning = true;
  intentarEscaneo();
};

async function intentarEscaneo() {
  if (!scanning) return;

  // Recortar el área del centro (donde está el guide-box)
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const cropW = vW * 0.8;
  const cropH = vH * 0.2;
  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(video, vW * 0.1, vH * 0.4, cropW, cropH, 0, 0, cropW, cropH);
  
  // Preprocesamiento: Grayscale y Contraste para compensar luz roja
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    data[i] = data[i+1] = data[i+2] = avg > 128 ? 255 : 0; // Umbral simple
  }
  ctx.putImageData(imgData, 0, 0);

  const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
  const limpio = text.replace(/[^0-9A-B]/g, "");
  
  // Buscar patrón: 9 números + 1 letra (A o B)
  const match = limpio.match(/\d{8,9}[AB]/);
  
  if (match) {
    const serieEncontrada = match[0];
    navigator.vibrate(200); // Vibración al detectar
    validarResultado(serieEncontrada);
  } else {
    requestAnimationFrame(intentarEscaneo);
  }
}

function validarResultado(serie) {
  scanning = false;
  const num = parseInt(serie.slice(0, -1));
  const letra = serie.slice(-1);
  const valor = document.getElementById("denominacion").value;
  
  let esIlegal = false;
  if (letra === "B") {
    esIlegal = rangosIlegales[valor].some(([min, max]) => num >= min && num <= max);
  }

  alert(`Serie Detectada: ${serie}\nResultado: ${esIlegal ? "❌ ILEGAL / FALSIFICADO" : "✅ SERIE LEGAL"}`);
  location.reload(); // Reiniciar para nuevo escaneo
}
