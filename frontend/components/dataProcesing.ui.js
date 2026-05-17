// ==========================================
// VARIABLES GLOBALES
// ==========================================
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
            calculateEngineeringProperties(); }
    } else {
        alert("No se detectó la tabla de datos (Load / Stroke). Verifique el formato del archivo.");
    }
}

// ==========================================
// FASE 2: CÁLCULO DE INGENIERÍA
// ==========================================
function  calculateEngineeringProperties() {
    const A0 = materialProperties.area;
    const L0 = materialProperties.length;
    
    if (isNaN(A0) || isNaN(L0) || A0 <= 0 || L0 <= 0) {
        console.warn("Faltan dimensiones de la probeta para calcular esfuerzo y deformación.");
        return;
    }

    // Leer el estado del botón "Aplicar Suavizado" (Compensación de Punta)
    const applyToeCompensation = document.getElementById('toggleSmoothing').checked;

    let tempStrain = [];
    let tempStress = [];
    let maxStress = 0;

    // 1. Transformación inicial de datos brutos
    for (let i = 0; i < globalRawData.length; i++) {
        const point = globalRawData[i];
        const deltaL = (point.elong !== 0) ? point.elong : point.stroke;
        const strain = deltaL / L0;
        const forceN = point.load * 9.81 * 1000;
        const stress = forceN / A0;

        tempStrain.push(strain);
        tempStress.push(stress);

        if (stress > maxStress) maxStress = stress;
    }
    mechanicalResults.UTS = maxStress;
    const lowerBoundStatic = maxStress * 0.10;

    // 2. Selección del Módulo de Young (E) y Ajuste de Datos
    processedData.strain = [];
    processedData.stress = [];

    if (applyToeCompensation && tempStrain.length > 20) {
        // --- ALGORITMO DE COMPENSACIÓN DE PUNTA (SLIDING WINDOW) ---
        const windowSize = 15; // Ventana de 15 puntos
        const searchLimit = Math.floor(tempStrain.length * 0.25); // Buscar en el primer 20%
        
        let bestR2 = -1;
        let bestE = 0;
        let bestEpsilon0 = 0;
        let bestIntercept = 0;
        for (let i = 0; i < searchLimit - windowSize; i++) {
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
            let n = windowSize;
            
            for (let j = 0; j < windowSize; j++) {
                let e = tempStrain[i + j];
                let s = tempStress[i + j];
                sumX += e; sumY += s; sumXY += (e * s); sumX2 += (e * e); sumY2 += (s * s);
            }
            
            // Regresión lineal
            let E_val = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            let intercept = (sumY - E_val * sumX) / n;
            
            // Cálculo del R^2
            let ssTot = sumY2 - (sumY * sumY) / n;
            let ssRes = 0;
            for (let j = 0; j < windowSize; j++) {
                let s_pred = E_val * tempStrain[i + j] + intercept;
                let diff = tempStress[i + j] - s_pred;
                ssRes += diff * diff;
            }
            
            let R2 = (ssTot !== 0) ? 1 - (ssRes / ssTot) : 0;
            // Seleccionar el ajuste perfecto
            if (R2 > bestR2) {
                bestR2 = R2;
                bestE = E_val;
                bestIntercept = intercept;
                bestEpsilon0 = tempStrain[i] - (tempStress[i] / bestE);
            }
        }
        mechanicalResults.E = bestE;
        let dataStress = [];
        // Transformación y Filtrado
        for (let i = 0; i < tempStrain.length; i++) {
            let correctedStrain = tempStrain[i] - bestEpsilon0;
            if (correctedStrain > 0) {
                processedData.strain.push(correctedStrain);
                processedData.stress.push(tempStress[i]);
            }
        }

        // let correctedStress = 0;
        // for (let i = 0; i < dataStress.length; i++){
        //     correctedStress= dataStress[i] - dataStress[0];
        //     processedData.stress.push(correctedStress);
        // }

    } else {
        // --- MÉTODO ESTÁTICO ORIGINAL (10% al 40% del UTS) ---
        processedData.strain = tempStrain;
        processedData.stress = tempStress;

        const upperBoundStatic = maxStress * 0.40;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, n = 0;

        for (let i = 0; i < processedData.stress.length; i++) {
            const s = processedData.stress[i];
            const e = processedData.strain[i];
            if (s >= lowerBoundStatic && s <= upperBoundStatic) {
                sumX += e; sumY += s; sumXY += (e * s); sumX2 += (e * e); n++;
            }
        }
        mechanicalResults.E = (n > 1) ? (n * sumXY - sumX * sumY) / (n * sumX2 - (sumX * sumX)) : 0;
    }

    // Asegurar que hay datos antes de calcular elongación
    if (processedData.strain.length > 0) {
        mechanicalResults.Elong = processedData.strain[processedData.strain.length - 1] * 100;
    } else {
        mechanicalResults.Elong = 0;
    }

    // 3. Offset 0.2% (Fluencia)
    processedData.offsetStrain = [];
    processedData.offsetStress = [];
    mechanicalResults.Sy = 0;
    let intersectionFound = false;

    for (let i = 0; i < processedData.strain.length; i++) {
        const currentStrain = processedData.strain[i];
        const currentStress = processedData.stress[i];
        
        // La línea paralela respeta el E calculado por cualquier método
        const offsetStressValue = mechanicalResults.E * (currentStrain - 0.002);
        
        // Limitar la línea visual de offset a la altura del gráfico
        if (offsetStressValue >= 0 && offsetStressValue <= mechanicalResults.UTS) {
            processedData.offsetStrain.push(currentStrain);
            processedData.offsetStress.push(offsetStressValue);
        }

        if (!intersectionFound && currentStress > lowerBoundStatic) {
            const deltaSigma = currentStress - offsetStressValue;
            if (deltaSigma <= 0) {
                mechanicalResults.Sy = currentStress; 
                intersectionFound = true;
            }
        }
    }

    // 4. Cálculo de Esfuerzo y Deformación Real
    processedData.trueStrain = [];
    processedData.trueStress = [];
    let reachedUTS = false;

    for (let i = 0; i < processedData.strain.length; i++) {
        const e = processedData.strain[i];
        const s = processedData.stress[i];

        if (s === mechanicalResults.UTS) reachedUTS = true;

        if (!reachedUTS || s === mechanicalResults.UTS) {
            processedData.trueStrain.push(Math.log(1 + e));
            processedData.trueStress.push(s * (1 + e));     
        }
    }

    updateResultsUI();
    renderGraph(processedData.strain, processedData.stress, processedData.offsetStrain, processedData.offsetStress);
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
        annotations: [
            { x: findStrainAtStress(strain, stress, mechanicalResults.Sy), y: mechanicalResults.Sy, xref: 'x', yref: 'y', text: 'Fluencia (0.2%)', showarrow: true, arrowhead: 2, ax: -40, ay: -30, font: { color: 'red' } },
            { x: findStrainAtStress(strain, stress, mechanicalResults.UTS), y: mechanicalResults.UTS, xref: 'x', yref: 'y', text: 'UTS', showarrow: true, arrowhead: 2, ax: 0, ay: -40, font: { color: '#0d6efd' } }
        ]
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
// Listener para el Switch de Suavizado / Compensación de Punta
    document.getElementById('toggleSmoothing').addEventListener('change', function() {
        if (globalRawData.length > 0) {
            // Recalcular todo el pipeline desde los datos crudos para aplicar el filtro
            calculateEngineeringProperties(); 
        }
    });
    document.getElementById('btnPrintReport').addEventListener('click', function() {
        window.print();
    });
});