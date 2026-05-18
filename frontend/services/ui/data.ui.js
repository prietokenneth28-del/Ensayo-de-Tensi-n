
// Funcion para graficar  
function renderGraph(strain, stress, offsetStrain, offsetStress, x_E, y_E, x_Sy, y_Sy) {
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
        name: 'Curva Esfuerzo - deformación', line: { color: '#0151ff', width: 2 }
    };

    var interpolationTrace = {
        x: x_E, y: y_E, mode: 'lines',
        line: { dash: 'dash', color: '#004e1a', width: 1.5 }, name: 'Interpolación lineal'
    };
    var offsetTrace = {
        x: offsetStrain, y: offsetStress, mode: 'lines',
        line: { dash: 'dash', color: 'red', width: 1.5 }, name: 'Offset 0.2%'
    };

    // Arreglo base de trazas
    let tracesToPlot = [curveTrace, interpolationTrace, offsetTrace];

    // Verificar si el switch de Esfuerzo Real está activado en el HTML
    const showTrueStress = document.getElementById('toggleTrueStress').checked;

    // if (showTrueStress && processedData.trueStrain.length > 0) {
    //     var trueTrace = {
    //         x: processedData.trueStrain, 
    //         y: processedData.trueStress, 
    //         mode: 'lines', 
    //         type: 'scattergl',
    //         name: 'Curva Esfuerzo Real', 
    //         line: { color: '#198754', width: 2, dash: 'dot' } // Verde y punteado
    //     };
    //     tracesToPlot.push(trueTrace);
    // }

    var layout = {
        title: { text: 'Curva Esfuerzo vs Deformación', font: { family: 'system-ui, -apple-system, sans-serif', size: 18 } },
        xaxis: { title: 'Deformación Unitaria (mm/mm)', zeroline: true, showgrid: true },
        yaxis: { title: 'Esfuerzo (MPa)', zeroline: true, showgrid: true },
        hovermode: 'closest', 
        margin: { l: 60, r: 30, t: 50, b: 50 },
        autosize: true, // Asegura que tome el tamaño del contenedor
        annotations: [
            { x: x_Sy, y: y_Sy, xref: 'x', yref: 'y', text: `Sy: ${Number(y_Sy.toFixed(2))} MPa`, showarrow: true, arrowhead: 2, ax: -40, ay: -30, font: { color: 'red' } }]
    };

    // Configuramos responsive: true para evitar solapamientos al redimensionar la ventana
    Plotly.newPlot('graphDiv', tracesToPlot, layout, {responsive: true});
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
        
        // 3. Pasar las variables directas a Plotly
        const offsetStrain = [0.002, data.x_Sy];
        const offsetStress = [0, data.y_Sy];
        const y_Sy = data.y_Sy
        const x_Sy = data.x_Sy
        renderGraph(data.strain_corrected, 
                    data.stress,
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

//
// Escuchador del botón para procesar y aplicar las configuraciones elegidas
document.getElementById('btnPrintReport').addEventListener('click', async function() { 
});