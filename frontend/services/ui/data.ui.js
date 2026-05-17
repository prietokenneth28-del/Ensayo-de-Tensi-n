// ==========================================
// VARIABLES GLOBALES
// ==========================================
import {enviarDatos} from "../api/api.js"

let globalRawData = [];
let materialProperties = {
    area: NaN,
    length: NaN
};

let processedData = {
    strain: [],
    stress: [],
    offsetStrain: [],
    offsetStress: [],
    trueStrain: [], 
    trueStress: []  
};

let mechanicalResults = {
    E: 0,
    Sy: 0,
    UTS: 0,
    Elong: 0
};

// ==========================================
// UTILIDADES
// ==========================================
function parseLocalFloat(str) {
    if (!str) return NaN;
    return parseFloat(str.replace(/,/g, '.'));
}

function findStrainAtStress(strainArr, stressArr, targetStress) {
    let minDiff = Infinity;
    let index = 0;
    for (let i = 0; i < stressArr.length; i++) {
        let diff = Math.abs(stressArr[i] - targetStress);
        if (diff < minDiff) {
            minDiff = diff;
            index = i;
        }
    }
    return strainArr[index];
}

function obtenerDatosFormulario() {
    return {
        area: document.getElementById('inputArea').value,
        length: document.getElementById('inputLength').value,
        units: document.getElementById('unitSelect').value,
        // Extraemos los arrays de la variable global globalRawData
        load: globalRawData.map(p => p.load),
        stroke: globalRawData.map(p => p.stroke)
    };
}

// ==========================================
// FASE 1: MÓDULO DE PARSING E INGESTA (Corregido y Robusto)
// ==========================================
function parseDocument(text) {
    // A. Regex flexibles para metadatos (A0, L0) - SE MANTIENE
    const areaMatch = text.match(/Area[\s:=]+([\d,.]+)/i);
    const lengthMatch = text.match(/OriginalGL[\s:=]+([\d,.]+)/i);

    materialProperties.area = areaMatch ? parseLocalFloat(areaMatch[1]) : NaN;
    materialProperties.length = lengthMatch ? parseLocalFloat(lengthMatch[1]) : NaN;

    // Llenar inputs de la UI - SE MANTIENE
    document.getElementById('inputArea').value = isNaN(materialProperties.area) ? "" : materialProperties.area;
    document.getElementById('inputLength').value = isNaN(materialProperties.length) ? "" : materialProperties.length;

    // Llenar tabla de Metadatos - SE MANTIENE
    const metadataBody = document.getElementById('metadataBody');
    if (metadataBody) {
        metadataBody.innerHTML = `
            <tr><th>Área (A0)</th><td>${isNaN(materialProperties.area) ? '<span class="text-danger">Faltante</span>' : materialProperties.area + ' mm²'}</td></tr>
            <tr><th>Longitud Calibrada (L0)</th><td>${isNaN(materialProperties.length) ? '<span class="text-danger">Faltante</span>' : materialProperties.length + ' mm'}</td></tr>
        `;
    }

    if (isNaN(materialProperties.area) || materialProperties.area <= 0) {
        alert("⚠️ No se detectó automáticamente el Área (A0) en el archivo. Por favor, digítela en el panel izquierdo.");
    }

    // B. Procesar datos tabulares con CORRECCIONES
    globalRawData = [];
    const lines = text.split('\n');
    let isDataSection = false; // Bandera para controlar cuándo empiezan los datos reales

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue; // Ignorar líneas vacías

        // --- SOLUCIÓN PARA LA PRIMERA LÍNEA ERRÓNEA ---
        // Buscamos un marcador más claro de inicio de datos para KENNETH.TXT.
        // Si ya estamos procesando datos O si encontramos una línea que contiene cabeceras numéricas, activamos la bandera.
        if (!isDataSection && /Load|Stroke|Elongation/i.test(line)) {
            continue; 
        }

        // --- SOLUCIÓN PARA LOS DECIMALES ---
        // Refinamos el regex para que sea más estricto y solo acepte líneas puramente numéricas válidas.
        // Este regex busca: un número (posiblemente con decimales), seguido de delimitadores flexibles, y otro número.
        // Si la línea es numérica y ya pasamos la cabecera, es un dato real.
        if (/^[\d,.-]+[\s,;]+[\d,.-]+/.test(line)) {
            isDataSection = true; // Ahora sí activamos la bandera de datos

            if (isDataSection) {
                // Separar usando delimitadores flexibles
                const columns = line.split(/[\s;]+/);
                
                if (columns.length >= 2) {
                    // --- PUNTO CRÍTICO: USAR parseFloat() a través de parseLocalFloat() ---
                    // parseLocalFloat() ya maneja la conversión de comas a puntos decimales.
                    const loadRaw = parseLocalFloat(columns[1]);   
                    const strokeRaw = parseLocalFloat(columns[2]); 
                    const elongRaw = columns.length >= 3 ? parseLocalFloat(columns[3]) : 0; 

                    // Evitar meter datos que se parsearon como NaN por error de lectura
                    if (!isNaN(loadRaw) && !isNaN(strokeRaw)) {
                        globalRawData.push({
                            load: loadRaw, // tf
                            stroke: strokeRaw, // mm
                            elong: elongRaw // mm
                        });
                    }
                }
            }
        }
    }

    globalRawData  = globalRawData.slice(1);
    console.log(`Ingesta completada: Se validaron ${globalRawData.length} puntos de datos.`);


    if (globalRawData.length > 0) {
    // Verificar que los primeros valores sean números válidos
        const firstStroke = globalRawData[0].stroke;
        const firstElong = globalRawData[0].elong;
        const firstLoad = globalRawData[0].load;

        if (!isNaN(firstStroke) && !isNaN(firstLoad)) {
            globalRawData = globalRawData.map((point, index) => ({
                load: !isNaN(point.load) ? point.load - firstLoad : 0,
                stroke: !isNaN(point.stroke) ? point.stroke - firstStroke : 0,
                elong: !isNaN(point.elong) ? point.elong - firstElong : 0
            }));

            // Ejecutar los cálculos solo si tenemos datos tabulares
             }
    } else {
        alert("No se detectó la tabla de datos (Load / Stroke). Verifique el formato del archivo.");
    }
}

function updateResultsUI() {
    const e_GPa = (mechanicalResults.E / 1000).toFixed(1);
    document.getElementById('valE').innerText = e_GPa + " GPa";
    document.getElementById('valSy').innerText = mechanicalResults.Sy.toFixed(1) + " MPa";
    document.getElementById('valUts').innerText = mechanicalResults.UTS.toFixed(1) + " MPa";
    document.getElementById('valElong').innerText = mechanicalResults.Elong.toFixed(2) + " %";
    
    document.getElementById('btnDownloadCSV').disabled = false;
    document.getElementById('btnPrintReport').disabled = false;
}


// ==========================================
// FASE 3: RENDERIZADO (Plotly)
// ==========================================
function renderGraph(strain, stress, offsetStrain, offsetStress) {
    // Limpiar clases estéticas iniciales del contenedor para que Plotly tome el control total
    const graphContainer = document.getElementById('graphDiv');
    graphContainer.classList.remove('d-flex', 'justify-content-center', 'align-items-center', 'bg-light', 'border', 'rounded');
    
    // Eliminar el mensaje de "Cargue un archivo..."
    const placeholder = document.getElementById('placeholderMsg');
    if (placeholder) {
        placeholder.remove();
    }

    var curveTrace = {
        x: strain, y: stress, mode: 'lines', type: 'scattergl',
        name: 'Curva de Ingeniería', line: { color: '#0d6efd', width: 2 }
    };

    var offsetTrace = {
        x: offsetStrain, y: offsetStress, mode: 'lines',
        line: { dash: 'dash', color: 'red', width: 1.5 }, name: 'Offset 0.2%'
    };

    // Arreglo base de trazas
    let tracesToPlot = [curveTrace, offsetTrace];

    // Verificar si el switch de Esfuerzo Real está activado en el HTML
    const showTrueStress = document.getElementById('toggleTrueStress').checked;

    if (showTrueStress && processedData.trueStrain.length > 0) {
        var trueTrace = {
            x: processedData.trueStrain, 
            y: processedData.trueStress, 
            mode: 'lines', 
            type: 'scattergl',
            name: 'Curva Esfuerzo Real', 
            line: { color: '#198754', width: 2, dash: 'dot' } // Verde y punteado
        };
        tracesToPlot.push(trueTrace);
    }

    var layout = {
        title: { text: 'Curva Esfuerzo vs Deformación', font: { family: 'system-ui, -apple-system, sans-serif', size: 18 } },
        xaxis: { title: 'Deformación Unitaria (mm/mm)', zeroline: true, showgrid: true },
        yaxis: { title: 'Esfuerzo (MPa)', zeroline: true, showgrid: true },
        hovermode: 'closest', 
        margin: { l: 60, r: 30, t: 50, b: 50 },
        autosize: true, // Asegura que tome el tamaño del contenedor
    };

    // Configuramos responsive: true para evitar solapamientos al redimensionar la ventana
    Plotly.newPlot('graphDiv', tracesToPlot, layout, {responsive: true});
}

// ==========================================
// LISTENERS Y EVENTOS (Carga inicial)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    
    // Carga de archivo
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            parseDocument(event.target.result);
        };
        reader.readAsText(file);
        // Se prende el boton para poder enviar los datos al backend
        document.getElementById('btnPrintReport').disabled = false;
    });

    // Edición manual

    document.getElementById('inputArea').addEventListener('change', function(e) {
        materialProperties.area = parseFloat(e.target.value);
        // Actualizamos la tabla si el usuario lo cambió a mano
        const cell = document.querySelector('#metadataBody tr:nth-child(1) td');
        if (cell) cell.innerText = materialProperties.area + " mm²";
        
        if(globalRawData.length > 0) calculateEngineeringProperties();
    });

    document.getElementById('inputLength').addEventListener('change', function(e) {
        materialProperties.length = parseFloat(e.target.value);
        // Actualizamos la tabla si el usuario lo cambió a mano
        const cell = document.querySelector('#metadataBody tr:nth-child(2) td');
        if (cell) cell.innerText = materialProperties.length + " mm";
        
        if(globalRawData.length > 0) calculateEngineeringProperties();
    });

    // Fase 4: Exportación
    document.getElementById('btnDownloadCSV').addEventListener('click', function() {
        if (processedData.strain.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,Strain (mm/mm),Stress (MPa),Offset Strain,Offset Stress\n";
        for (let i = 0; i < processedData.strain.length; i++) {
            let row = [
                processedData.strain[i].toFixed(6), processedData.stress[i].toFixed(2),
                processedData.offsetStrain[i] ? processedData.offsetStrain[i].toFixed(6) : "",
                processedData.offsetStress[i] ? processedData.offsetStress[i].toFixed(2) : ""
            ];
            csvContent += row.join(",") + "\n";
        }
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Resultados_Ensayo_Traccion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Listener para el Switch de Esfuerzo Real
    document.getElementById('toggleTrueStress').addEventListener('change', function() {
        if (processedData.strain.length > 0) {
            renderGraph(processedData.strain, processedData.stress, processedData.offsetStrain, processedData.offsetStress);
        }
    });

    document.getElementById('btnPrintReport').addEventListener('click', async function() {
        const payload = obtenerDatosFormulario();
        
        if (!payload.area || !payload.length || globalRawData.length === 0) {
            alert("Por favor cargue un archivo y complete el área y longitud.");
            return;
        }

    try {
        const data = await enviarDatos(payload);
        
        // 1. Actualizar Medallas/Badges de resultados
        document.getElementById('valE').innerText = `${data.E} GPa`;
        document.getElementById('valSy').innerText = `${data.Sy} MPa`;
        document.getElementById('valUts').innerText = `${data.Sut} MPa`;
        
        // 2. Graficar con los datos corregidos que vienen de Python
        // Creamos la recta de offset para Plotly
        const offsetStrain = [0.002, data.x_Sy];
        const offsetStress = [0, data.y_Sy];
        
        renderGraph(data.strain_corrected, data.stress, offsetStrain, offsetStress);
        
        console.log("Procesamiento exitoso");

    } catch (error) {
        console.error("Error en la comunicación:", error);
        alert("No se pudo conectar con el motor de cálculo en Python.");
    }
});
});