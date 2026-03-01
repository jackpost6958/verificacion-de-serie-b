const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("status-msg");

// Rangos de billetes ilegales (Datos originales)
const rangosIlegales = {
  10: [[67250001, 67700000], [69050001, 69500000], [69500001, 69950000], [69950001, 70400000], [70400001, 70850000], [70850001, 71300000], [76310012, 85139995], [86400001, 86850000], [90900001, 91350000], [91800001, 92250000]],
  20: [[87280145, 91646549], [96650001, 97100000], [99800001, 100250000], [100250001, 100700000], [109250001, 109700000], [110600001, 111050000], [111050001, 111500000], [111950001, 112400000], [112400001, 112850000], [112850001, 113300000], [114200001, 114650000], [114650001, 115100000], [115100001, 115550000], [118700001, 119150000], [119150001, 119600000], [120500001, 120950000]],
  50: [[77100001, 77550000], [78000001, 78450000], [78900001, 96350000], [96350001, 96800000], [96800001, 97250000], [98150000, 98600000], [104900001, 105350000], [105350001, 105800000], [106700001, 107150000], [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]]
};

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: { ideal: 1280 } } 
    });
    video.srcObject = stream;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    setTimeout(analizarCiclo, 1000); // Dar tiempo a la cámara para enfocar
  } catch (e) { alert("Error al acceder a la cámara."); }
};

async function analizarCiclo() {
  if (document.getElementById("scanner-container").hidden) return;

  const guide = document.getElementById("guide-box").getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  // Mapeo de coordenadas CSS a coordenadas de resolución de video
  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;

  canvas.width = guide.width * scaleX;
  canvas.height = guide.height * scaleY;

  ctx.drawImage(
    video, 
    (guide.left - videoRect.left) * scaleX, 
    (guide.top - videoRect.top) * scaleY, 
    canvas.width, canvas.height, 
    0, 0, canvas.width, canvas.height
  );

  // Mejorar contraste para OCR
  const imgData = ctx.getImageData(0,0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i=0; i<d.length; i+=4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    let gray = (r + g + b) / 3;
    d[i] = d[i+1] = d[i+2] = gray < 100 ? 0 : 255; // Blanco y negro puro
  }
  ctx.putImageData(imgData, 0, 0);

  const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
  
  // Limpieza agresiva de caracteres comunes erróneos
  const limpio = text.toUpperCase()
    .replace(/O/g, "0").replace(/I/g, "1").replace(/S/g, "5")
    .replace(/[^0-9A-Z]/g, "");

  console.log("Detectado:", limpio);

  // Intentar encontrar patrón de 8-9 dígitos + Letra
  const match = limpio.match(/(\d{7,9})([A-Z])/);

  if (match) {
    const serieCompleta = match[1] + match[2];
    navigator.vibrate(200); 
    mostrarResultado(serieCompleta);
  } else {
    // Reintentar en 800ms (menos pesado que cada frame)
    setTimeout(analizarCiclo, 800);
  }
}

function mostrarResultado(serie) {
  const num = parseInt(serie.replace(/\D/g, ""));
  const letra = serie.slice(-1);
  const denominacion = document.getElementById("denominacion").value;
  
  let esIlegal = false;
  if (letra === "B") { // Según tu lógica original, el problema es con la serie B
    esIlegal = rangosIlegales[denominacion].some(([min, max]) => num >= min && num <= max);
  }

  const msg = esIlegal 
    ? `⚠️ SERIE ILEGAL DETECTADA\n${serie}\nEste billete coincide con rangos reportados.`
    : `✅ SERIE LEGAL\n${serie}\nNo se encontraron anomalías en el sistema.`;
  
  alert(msg);
  location.reload();
}

document.getElementById("closeBtn").onclick = () => location.reload();
