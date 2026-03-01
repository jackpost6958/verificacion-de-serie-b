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
let votos = {}; 

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1920 } } 
    });
    video.srcObject = stream;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    procesar();
  } catch (e) { alert("Error al iniciar cámara."); }
};

async function procesar() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  
  // Canvas más ancho para no cortar el primer dígito
  canvas.width = 800; 
  canvas.height = 150;

  // Tomamos un área un poco más amplia para asegurar que el primer dígito entre
  ctx.drawImage(video, vW * 0.1, vH * 0.4, vW * 0.8, vH * 0.2, 0, 0, 800, 150);

  // Procesamiento de imagen para resaltar texto negro sobre fondo de billete
  let imgData = ctx.getImageData(0, 0, 800, 150);
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let brightness = (d[i] + d[i+1] + d[i+2]) / 3;
    // Umbral más bajo para capturar dígitos delgados iniciales
    let b = brightness < 110 ? 0 : 255; 
    d[i] = d[i+1] = d[i+2] = b;
  }
  ctx.putImageData(imgData, 0, 0);

  const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  });

  const limpio = text.replace(/[^0-9A-Z]/g, "");
  
  // EXPRESIÓN REGULAR ESTRICTA: 9 números seguidos de 1 letra A o B
  const match = limpio.match(/(\d{9})([AB])/);

  if (match) {
    const serieEncontrada = match[1] + match[2];
    votos[serieEncontrada] = (votos[serieEncontrada] || 0) + 1;
    
    statusMsg.innerText = `Serie detectada: ${serieEncontrada} (${votos[serieEncontrada]}/2)`;

    if (votos[serieEncontrada] >= 2) {
      verificarIlegalidad(serieEncontrada, parseInt(match[1]), match[2]);
      return;
    }
  } else {
    // Si detecta algo pero no tiene 9 dígitos, damos una pista visual
    if (limpio.length > 0) statusMsg.innerText = "Alinee mejor el primer dígito...";
  }

  setTimeout(procesar, 400);
}

function verificarIlegalidad(serie, num, letra) {
  scanning = false;
  const denom = document.getElementById("denominacion").value;
  let esIlegal = (letra === "B") && rangos[denom].some(([min, max]) => num >= min && num <= max);

  if (navigator.vibrate) navigator.vibrate(300);

  alert(`${esIlegal ? '⚠️ SERIE INVÁLIDA (ILEGAL)' : '✅ SERIE VÁLIDA'}\n\nSerie: ${serie}\nDenominación: Bs. ${denom}`);
  location.reload();
}
