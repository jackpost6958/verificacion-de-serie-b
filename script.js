const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const rangos = {
  10: [[67250001, 67700000], [69050001, 69500000], [69500001, 69950000], [69950001, 70400000], [70400001, 70850000], [70850001, 71300000], [76310012, 85139995], [86400001, 86850000], [90900001, 91350000], [91800001, 92250000]],
  20: [[87280145, 91646549], [96650001, 97100000], [99800001, 100250000], [100250001, 100700000], [109250001, 109700000], [110600001, 111050000], [111050001, 111500000], [111950001, 112400000], [112400001, 112850000], [112850001, 113300000], [114200001, 114650000], [114650001, 115100000], [115100001, 115550000], [118700001, 119150000], [119150001, 119600000], [120500001, 120950000]],
  50: [[77100001, 77550000], [78000001, 78450000], [78900001, 96350000], [96350001, 96800000], [96800001, 97250000], [98150001, 98600000], [104900001, 105350000], [105350001, 105800000], [106700001, 107150000], [107600001, 108050000], [108050001, 108500000], [109400001, 109850000]]
};

let scanning = false;

document.getElementById("scanBtn").onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", focusMode: "continuous" } 
    });
    video.srcObject = stream;
    document.getElementById("main-ui").hidden = true;
    document.getElementById("scanner-container").hidden = false;
    scanning = true;
    procesarImagen();
  } catch (e) { alert("Error: Permitir cámara."); }
};

async function procesarImagen() {
  if (!scanning) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if(vW === 0) { requestAnimationFrame(procesarImagen); return; }

  // Recorte exacto del guía-box
  canvas.width = 400; canvas.height = 80;
  ctx.drawImage(video, vW*0.1, vH*0.4, vW*0.8, vH*0.2, 0, 0, 400, 80);

  // Filtro B/N para mejorar lectura
  let imgData = ctx.getImageData(0,0,400,80);
  let d = imgData.data;
  for(let i=0; i<d.length; i+=4){
    let gray = (d[i]+d[i+1]+d[i+2])/3;
    d[i] = d[i+1] = d[i+2] = gray < 120 ? 0 : 255;
  }
  ctx.putImageData(imgData,0,0);

  const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
  const match = text.toUpperCase().replace(/[^0-9A-Z]/g, "").match(/(\d{8,9})([A-Z])/);

  if (match) {
    if(navigator.vibrate) navigator.vibrate(200);
    validar(match[1], match[2]);
  } else {
    setTimeout(procesarImagen, 500);
  }
}

function validar(numStr, letra) {
  scanning = false;
  const num = parseInt(numStr);
  const valor = document.getElementById("denominacion").value;
  const ilegal = (letra === "B") && rangos[valor].some(([min, max]) => num >= min && num <= max);
  
  alert(`${ilegal ? '❌ SERIE ILEGAL' : '✅ SERIE LEGAL'}\nDetectado: ${numStr}${letra}`);
  location.reload();
}

document.getElementById("closeBtn").onclick = () => location.reload();
