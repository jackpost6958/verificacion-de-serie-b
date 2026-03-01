const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("status-msg");

// BASE DE DATOS ACTUALIZADA SEGÚN TUS RANGOS
const baseDatosIlegal = {
  10: [
    [067250001, 067700000], [069050001, 069500000], [069500001, 069950000],
    [069950001, 070400000], [070400001, 070850000], [070850001, 071300000],
    [076310012, 085139995], [086400001, 086850000], [090900001, 091350000],
    [091800001, 092250000]
  ],
  20: [
    [087280145, 091646549], [096650001, 097100000], [099800001, 100250000],
    [100250001, 100700000], [109250001, 109700000], [110600001, 111050000],
    [111050001, 111500000], [111950001, 112400000], [112400001, 112850000],
    [112850001, 113300000], [114200001, 114650000], [114650001, 115100000],
    [115100001, 115550000], [118700001, 119150000], [119150001, 119600000],
    [120500001, 120950000]
  ],
  50: [
    [077100001, 077550000], [078000001, 078450000], [078900001, 096350000],
    [096350001, 096800000], [096800001, 097250000], [098150001, 098600000],
    [104900001, 105350000], [105350001, 105800000], [106700001, 107150000],
    [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]
  ]
};

let scanning = false;
let track = null;

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1920 } } 
    });
    video.srcObject = stream;
    track = stream.getVideoTracks()[0];

    // ENCENDER FLASH AUTOMÁTICO
    const capabilities = track.getCapabilities();
    if (capabilities.torch) {
      await track.applyConstraints({ advanced: [{ torch: true }] });
    }

    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    procesarFrame();
  } catch (e) { alert("Error: Use HTTPS y permita la cámara."); }
};

async function procesarFrame() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (vW === 0) { requestAnimationFrame(procesarFrame); return; }

  // Canvas de alta definición para el recorte
  canvas.width = 1000;
  canvas.height = 200;

  // RECORTE ENFOCADO: Zoom al margen central
  ctx.drawImage(video, vW * 0.1, vH * 0.42, vW * 0.8, vH * 0.15, 0, 0, 1000, 200);

  // FILTRO DE NITIDEZ (Binarización agresiva)
  let imgData = ctx.getImageData(0, 0, 1000, 200);
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let gray = (d[i] + d[i+1] + d[i+2]) / 3;
    let v = gray < 120 ? 0 : 255; // Números negros, fondo blanco
    d[i] = d[i+1] = d[i+2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  // RECONOCIMIENTO CON TESSERACT
  const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
    tessedit_char_whitelist: '0123456789AB',
    tessedit_pageseg_mode: '7'
  });

  const limpio = text.toUpperCase().replace(/[^0-9AB]/g, "");
  const match = limpio.match(/(\d{8,9})([AB])/); // Acepta 8 o 9 dígitos por si hay cortes

  if (match) {
    ejecutarVerificacion(match[1] + match[2], parseInt(match[1]), match[2]);
  } else {
    setTimeout(procesarFrame, 300);
  }
}

function ejecutarVerificacion(serieFull, numero, letra) {
  scanning = false;
  const denominacion = document.getElementById("denominacion").value;
  
  if (track && track.getCapabilities().torch) {
    track.applyConstraints({ advanced: [{ torch: false }] });
  }

  let ilegal = false;
  if (letra === "B") {
    ilegal = baseDatosIlegal[denominacion].some(([min, max]) => numero >= min && numero <= max);
  }

  // MOSTRAR MODAL EN LUGAR DE ALERT
  const modal = document.getElementById("custom-modal");
  const mTitle = document.getElementById("modal-title");
  const mText = document.getElementById("modal-text");

  mTitle.innerText = ilegal ? "⚠️ SERIE NO VÁLIDA" : "✅ SERIE VÁLIDA";
  mTitle.style.color = ilegal ? "#ff4444" : "#00ff88";
  mText.innerHTML = `Detectado: <strong>${serieFull}</strong><br>Billete de Bs. ${denominacion}`;
  
  modal.hidden = false;

  if (navigator.vibrate) navigator.vibrate(ilegal ? [200, 100, 200] : 100);

  document.getElementById("modal-close").onclick = () => {
    location.reload(); // Recargar al cerrar para volver a escanear
  };
}


