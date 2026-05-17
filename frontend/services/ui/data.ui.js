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
        renderGraph(data.strain_corrected, data.stress, offsetStrain, offsetStress);
        
        document.getElementById('btnPrintReport').disabled = false;

    } catch (error) {
        console.error("Error en la comunicación:", error);
        alert("Hubo un problema al procesar el documento en el servidor.");
    }
});