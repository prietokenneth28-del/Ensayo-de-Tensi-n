
// Funcion para graficar  
// Variable global para almacenar los últimos datos traídos de Python
// Variable global para almacenar los últimos datos traídos de Python
let lastGraphData = null;

const rangeMin = document.getElementById('rangeMin').value
const rangeMax = document.getElementById('rangeMax').value


function renderGraph(strain_corrected, strain, stress, stress_corrected, offsetStrain, offsetStress, x_E, y_E, x_Sy, y_Sy) {
    // 1. Guardar los datos en memoria para redibujar sin llamar al backend
    lastGraphData = { strain_corrected, strain, stress, stress_corrected, offsetStrain, offsetStress, x_E, y_E, x_Sy, y_Sy };

    const graphContainer = document.getElementById('graphDiv');
    graphContainer.classList.remove('d-flex', 'justify-content-center', 'align-items-center', 'bg-light', 'border', 'rounded');
    
    const placeholder = document.getElementById('placeholderMsg');
    if (placeholder) placeholder.remove();

    // --- LÓGICA DE COMPENSACIÓN DESDE EL FRONTEND ---
    const applySmoothing = document.getElementById('toggleSmoothing').checked;
    let tracesToPlot = [];

    // Calculamos cuánto se desplazó la gráfica en Python restando los últimos puntos de ambos vectores
    let epsilon_0 = strain[strain.length - 1] - strain_corrected[strain_corrected.length - 1];

    // 1. Trazas de la Curva Principal
    if (applySmoothing) {
        var curveTrace = {
            x: strain_corrected, 
            y: stress_corrected, 
            mode: 'lines', type: 'scattergl',
            name: 'Curva Esfuerzo - deformación', line: { color: '#0151ff', width: 2 }
        }; 
        tracesToPlot.push(curveTrace);
    } else {
        var curveTrace = {
            x: strain, 
            y: stress, 
            mode: 'lines', type: 'scattergl',
            name: 'Curva Original (Sin compensar)', line: { color: '#0151ff', width: 2 }
        }; 
        tracesToPlot.push(curveTrace);
    }

    // 2. Condicional para mostrar la Interpolación Lineal
    if (document.getElementById('toggleInterpolation').checked && x_E && y_E) { 
        // Si no hay suavizado, desplazamos la recta X sumando epsilon_0
        let adjusted_x_E = applySmoothing ? x_E : x_E.map(val => val + epsilon_0);
             
        var interpolationTrace = {
            x: adjusted_x_E, y: y_E, mode: 'lines',
            line: { dash: 'dash', color: '#004e1a', width: 1.5 }, name: 'Interpolación lineal'
        };
        tracesToPlot.push(interpolationTrace);
    }

    // 3. Condicional para mostrar la recta de Offset 0.2%
    if (document.getElementById('toggleOffset').checked && offsetStrain && offsetStress) {
        // Desplazamos la recta en X si el suavizado está desactivado
        let adjusted_offsetStrain = applySmoothing ? offsetStrain : offsetStrain.map(val => val + epsilon_0);

        var offsetTrace = {
            x: adjusted_offsetStrain, y: offsetStress, mode: 'lines',
            line: { dash: 'dash', color: 'red', width: 1.5 }, name: 'Offset 0.2%'
        };
        tracesToPlot.push(offsetTrace);
    }

    // Configuración del layout
    var layout = {
        title: { text: 'Curva Esfuerzo vs Deformación', font: { family: 'system-ui, -apple-system, sans-serif', size: 18 } },
        xaxis: { title: 'Deformación Unitaria (mm/mm)', zeroline: true, showgrid: true },
        yaxis: { title: 'Esfuerzo (MPa)', zeroline: true, showgrid: true },
        hovermode: 'closest', 
        margin: { l: 60, r: 30, t: 50, b: 50 },
        autosize: true,
        annotations: []
    };

    // 4. Mover la etiqueta flotante del "Sy" junto con la curva
    if (document.getElementById('toggleOffset').checked && x_Sy !== undefined && y_Sy !== undefined) {
        let final_x_Sy = applySmoothing ? x_Sy : x_Sy + epsilon_0;

        layout.annotations.push({ 
            x: final_x_Sy, y: y_Sy, xref: 'x', yref: 'y', 
            text: `Sy: ${Number(y_Sy).toFixed(2)} MPa`, 
            showarrow: true, arrowhead: 2, ax: -40, ay: -30, font: { color: 'red' } 
        });
    }

    Plotly.newPlot('graphDiv', tracesToPlot, layout, {responsive: true});
}

// ------------------------------------------------------------------
// LISTENERS: Para actualizar la gráfica al hacer clic en los checkboxes
// ------------------------------------------------------------------
function updateGraphVisibility() {
    if (lastGraphData) {
        renderGraph(
            lastGraphData.strain_corrected,
            lastGraphData.strain, 
            lastGraphData.stress, 
            lastGraphData.stress_corrected, 
            lastGraphData.offsetStrain, 
            lastGraphData.offsetStress, 
            lastGraphData.x_E, 
            lastGraphData.y_E, 
            lastGraphData.x_Sy, 
            lastGraphData.y_Sy
        );
    }
}


// Captura todos los valores actuales de la UI, tanto de la probeta como de la configuración
function obtenerDatosFormulario() {
    return {
        area: document.getElementById('inputArea').value,
        length: document.getElementById('inputLength').value,
        units: document.getElementById('unitSelect').value,
        
        // --- NUEVOS PARÁMETROS DE CONFIGURACIÓN ---
        applySmoothing: document.getElementById('toggleSmoothing').checked,
        // Opcional: si agregas inputs numéricos en el HTML para los rangos de la zona elástica
        idxInicio: document.getElementById('inputIdxInicio')?.value || 50,
        idxFin: document.getElementById('inputIdxFin')?.value || 80,

        // Vectores de datos crudos cargados
        load: globalRawData.map(p => p.load),
        stroke: globalRawData.map(p => p.stroke)
    };
}

// Enviar el archivo al backend 
document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Desplegamos el indicador de carga si lo tienes
    const formData = new FormData();
    formData.append('file', file);
    formData.append('units', 'Metrico'); // O el id de tu unitSelect
    
    // Si el usuario ya había digitado algo, se envía para sobreescribir el parser
    const inputArea = document.getElementById('inputArea').value;
    const inputLength = document.getElementById('inputLength').value;
    if (inputArea) formData.append('area', inputArea);
    if (inputLength) formData.append('length', inputLength);

    try {
        const response = await fetch('http://localhost:5000/upload-and-calculate', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }

        // 1. Llenar inputs de UI con lo que Python encontró y parseó
        document.getElementById('inputArea').value = data.parsed_area;
        document.getElementById('inputLength').value = data.parsed_length;
        const cellArea = document.querySelector('#metadataBody tr:nth-child(1) td');
        const cellLength = document.querySelector('#metadataBody tr:nth-child(2) td');
        if (cellArea) cellArea.innerText = data.parsed_area + " mm²";
        if (cellLength) cellLength.innerText = data.parsed_length + " mm";

        // 2. Actualizar las medallas/badges de ingeniería
        document.getElementById('valE').innerText = `${data.E} GPa`;
        document.getElementById('valSy').innerText = `${data.Sy} MPa`;
        document.getElementById('valUts').innerText = `${data.Sut} MPa`;
        document.getElementById('valElong').innerText = `${data.Elong} %`;

        // 3. Pasar las variables directas a Plotly
        const offsetStrain = [0.002, data.x_Sy];
        const offsetStress = [0, data.y_Sy];
        const y_Sy = data.y_Sy
        const x_Sy = data.x_Sy
        renderGraph(data.strain_corrected,
                    data.strain,
                    data.stress,
                    data.stress_corrected,
                    offsetStrain, offsetStress,
                    data.x_plot_elastic,
                    data.y_plot_elastic,
                    x_Sy, y_Sy);
        
        document.getElementById('btnPrintReport').disabled = false;

    } catch (error) {
        console.error("Error en la comunicación:", error);
        alert("Hubo un problema al procesar el documento en el servidor.");
    }
});

document.getElementById('toggleSmoothing').addEventListener('change', updateGraphVisibility);
document.getElementById('toggleInterpolation').addEventListener('change', updateGraphVisibility);
document.getElementById('toggleOffset').addEventListener('change', updateGraphVisibility);


//
// Escuchador del botón para procesar y aplicar las configuraciones elegidas
    document.getElementById('btnPrintReport').addEventListener('click', function() {
        window.print();
    });