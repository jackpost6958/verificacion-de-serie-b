const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("status-msg");

// BASE DE DATOS CORREGIDA: Sin ceros iniciales (literales octales prohibidos)
const baseDatosIlegal = {
  10: [
    [67250001, 67700000], [69050001, 69500000], [69500001, 69950000],
    [69995001, 70400000], [70400001, 70850000], [70850001, 71300000],
    [76310012, 85139995], [86400001, 86850000], [90900001, 91350000],
    [91800001, 92250000]
  ],
  20: [
    [87280145, 91646549], [96650001, 97100000], [99800001, 100250000],
    [100250001, 100700000], [109250001, 109700000], [110600001, 111050000],
    [111050001, 111500000], [111950001, 112400000], [112400001, 112850000],
    [112850001, 113300000], [114200001, 114650000], [114650001, 115100000],
    [115100001, 115550000], [118700001, 119150000], [119150001, 119600000],
    [120500001, 120950000]
  ],
  50: [
    [77100001, 77550000], [78000001, 78450000], [78900001, 96350000],
    [96350001, 96800000], [96800001, 97250000], [98150001, 98600000],
    [104900001, 105350000], [105350001, 105800000], [106700001, 107150000],
    [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]
  ]
};

let scanning = false;
let streamInstance = null;
let worker = null;

// Inicializar Tesseract una sola vez
async function initTesseract() {
  if (!worker) {
    statusMsg.innerText = "Iniciando motor IA...";
    worker = await Tesseract.createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789AB',
      tessedit_pageseg_mode: '7',
    });
  }
}

document.getElementById("scanBtn").onclick = async () => {
  try {
    await initTesseract();
    streamInstance = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1280 } } 
    });
    video.srcObject = streamInstance;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    statusMsg.innerText = "Enfoque la serie numérica";
    procesarFrame();
  } catch (e) { alert("Error: Use HTTPS y permita el acceso a la cámara."); }
};

async function procesarFrame() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (vW === 0) { requestAnimationFrame(procesarFrame); return; }

  // Recortar solo el área del recuadro para procesar menos datos
  canvas.width = 800;
  canvas.height = 200;
  ctx.drawImage(video, vW * 0.1, vH * 0.4, vW * 0.8, vH * 0.2, 0, 0, 800, 200);

  // Filtro de contraste binario (Blanco y Negro puro)
  let imgData = ctx.getImageData(0, 0, 800, 200);
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let gray = (d[i] + d[i+1] + d[i+2]) / 3;
    let v = gray < 110 ? 0 : 255; 
    d[i] = d[i+1] = d[i+2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  try {
    const { data: { text } } = await worker.recognize(canvas);
    const limpio = text.replace(/[^0-9AB]/g, "");
    const match = limpio.match(/(\d{8,9})([AB])/);

    if (match) {
      verificar(match[1] + match[2], parseInt(match[1]), match[2]);
    } else {
      setTimeout(procesarFrame, 400); // Pequeña pausa para no saturar CPU
    }
  } catch (err) {
    requestAnimationFrame(procesarFrame);
  }
}

function verificar(serieFull, numero, letra) {
  scanning = false;
  const denom = document.getElementById("denominacion").value;
  
  if (streamInstance) {
    streamInstance.getTracks().forEach(t => t.stop());
  }

  // Lógica: Solo es ilegal si termina en B y el número está en el rango
  let esIlegal = false;
  if (letra === "B" && baseDatosIlegal[denom]) {
    esIlegal = baseDatosIlegal[denom].some(([min, max]) => numero >= min && numero <= max);
  }

  const modal = document.getElementById("custom-modal");
  const mTitle = document.getElementById("modal-title");
  const mText = document.getElementById("modal-text");

  mTitle.innerText = esIlegal ? "⚠️ SERIE NO VÁLIDA" : "✅ SERIE VÁLIDA";
  mTitle.style.color = esIlegal ? "#ff4444" : "#00ff88";
  mText.innerHTML = `Serie: <strong>${serieFull}</strong><br>Billete: Bs. ${denom}`;
  
  modal.hidden = false;

  if (navigator.vibrate) navigator.vibrate(esIlegal ? [200, 100, 200] : 100);
}

document.getElementById("modal-close").onclick = () => location.reload();
document.getElementById("closeBtn").onclick = () => location.reload();
