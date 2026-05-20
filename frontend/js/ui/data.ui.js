class EnsayoTraccion {
    static globalIdCounter = 1; // Contador para enumerar los ensayos (Ensayo 1, Ensayo 2...)

    constructor(containerElement) {
        this.container = containerElement;
        this.testId = EnsayoTraccion.globalIdCounter++;
        
        // Variables de estado aisladas para ESTE ensayo específico
        this.currentUploadedFile = null;
        this.lastGraphData = null;

        // 1. Vincular los elementos del DOM de este bloque específico (Buscando por clase)
        this.headerTitle = this.container.querySelector('.header-title');
        this.fileInput = this.container.querySelector('.file-input');
        this.btnRecalculate = this.container.querySelector('.btn-recalculate');
        this.inputArea = this.container.querySelector('.input-area');
        this.inputLength = this.container.querySelector('.input-length');
        
        this.valE = this.container.querySelector('.val-e');
        this.valSy = this.container.querySelector('.val-sy');
        this.valUts = this.container.querySelector('.val-uts');
        this.valElong = this.container.querySelector('.val-elong');
        
        this.graphDiv = this.container.querySelector('.graph-div');
        this.placeholderMsg = this.container.querySelector('.placeholder-msg');

        // Personalizar título
        this.headerTitle.innerText = `Ensayo ${this.testId}`;

        // 2. Configurar Checkboxes dinámicos (Bootstrap necesita IDs únicos para enlazar el label)
        this.setupCheckboxes();

        // 3. Inicializar los Listeners
        this.initEvents();
    }

    setupCheckboxes() {
        const setupToggle = (checkboxClass, labelClass, name) => {
            const chk = this.container.querySelector(checkboxClass);
            const lbl = this.container.querySelector(labelClass);
            if(chk && lbl) {
                const uniqueId = `toggle-${name}-${this.testId}`;
                chk.id = uniqueId;
                lbl.setAttribute('for', uniqueId); // Enlaza el botón visual al checkbox real
                chk.addEventListener('change', () => this.updateGraphVisibility());
            }
            return chk; // Retorna el elemento para guardarlo en la clase
        };

        this.toggleSmoothing = setupToggle('.toggle-smoothing', '.label-smoothing', 'smoothing');
        this.toggleInterpolation = setupToggle('.toggle-interpolation', '.label-interpolation', 'interpolation');
        this.toggleOffset = setupToggle('.toggle-offset', '.label-offset', 'offset');
    }

    initEvents() {
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.currentUploadedFile = file;
                this.processAndRenderGraph();
            }
        });

        this.btnRecalculate.addEventListener('click', () => {
            this.processAndRenderGraph();
        });

    }

    async processAndRenderGraph() {
        if (!this.currentUploadedFile) {
            alert(`Por favor cargue un archivo en el Ensayo ${this.testId}.`);
            return;
        }

        const formData = new FormData();
        formData.append('file', this.currentUploadedFile);
        
        // Leer configuración del panel lateral (Estos sí son globales)
        const unitSelect = document.getElementById('unitSelect');
        const rangeMin = document.getElementById('rangeMin');
        const rangeMax = document.getElementById('rangeMax');

        formData.append('units', unitSelect ? unitSelect.value : 'Metrico');
        if (this.inputArea.value) formData.append('area', this.inputArea.value);
        if (this.inputLength.value) formData.append('length', this.inputLength.value);
        if (rangeMin) formData.append('rangeMin', rangeMin.value);
        if (rangeMax) formData.append('rangeMax', rangeMax.value);

        this.btnRecalculate.innerText = "⏳ Procesando...";

        try {
            const response = await fetch('http://localhost:5000/upload-and-calculate', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(`Error en Ensayo ${this.testId}: ` + data.error);
                return;
            }

            // Actualizar UI del bloque
            this.inputArea.value = data.parsed_area;
            this.inputLength.value = data.parsed_length;
            this.valE.innerText = `${data.E} GPa`;
            this.valSy.innerText = `${data.Sy} MPa`;
            this.valUts.innerText = `${data.Sut} MPa`;
            this.valElong.innerText = `${data.Elong} %`;

            // Guardar datos para repintado
            this.lastGraphData = {
                ...data,
                offsetStrain: [0.002, data.x_Sy],
                offsetStress: [0, data.y_Sy]
            };

            const globalPrintBtn = document.getElementById('btnPrintGlobalReport');
            if (globalPrintBtn) globalPrintBtn.disabled = false;

            this.updateGraphVisibility();
            
        } catch (error) {
            console.error("Error:", error);
            alert("Hubo un problema al comunicarse con el servidor en Python.");
        } finally {
            this.btnRecalculate.innerText = "🔄 Recalcular Ensayo";
        }
    }

    updateGraphVisibility() {
        if (!this.lastGraphData) return;

        // Quitar estado de "vacío"
        if (this.placeholderMsg) this.placeholderMsg.remove();
        this.graphDiv.classList.remove('d-flex', 'justify-content-center', 'align-items-center', 'bg-light', 'border', 'rounded');

        const data = this.lastGraphData;
        const applySmoothing = this.toggleSmoothing.checked;
        const showInterpolation = this.toggleInterpolation.checked;
        const showOffset = this.toggleOffset.checked;

        let tracesToPlot = [];
        let epsilon_0 = data.strain[data.strain.length - 1] - data.strain_corrected[data.strain_corrected.length - 1];

        // 1. Curva Principal
        if (applySmoothing) {
            tracesToPlot.push({
                x: data.strain_corrected, y: data.stress_corrected, mode: 'lines', type: 'scattergl',
                name: 'Esfuerzo-Deformación', line: { color: '#0151ff', width: 2 }
            });
        } else {
            tracesToPlot.push({
                x: data.strain, y: data.stress, mode: 'lines', type: 'scattergl',
                name: 'Curva Original', line: { color: '#0151ff', width: 2 }
            });
        }

        // 2. Interpolación
        if (showInterpolation && data.x_plot_elastic && data.y_plot_elastic) {
            let adjusted_x_E = applySmoothing ? data.x_plot_elastic : data.x_plot_elastic.map(val => val + epsilon_0);
            tracesToPlot.push({
                x: adjusted_x_E, y: data.y_plot_elastic, mode: 'lines',
                line: { dash: 'dash', color: '#004e1a', width: 1.5 }, name: 'Interpolación'
            });
        }

        // 3. Offset
        if (showOffset && data.offsetStrain && data.offsetStress) {
            let adjusted_offsetStrain = applySmoothing ? data.offsetStrain : data.offsetStrain.map(val => val + epsilon_0);
            tracesToPlot.push({
                x: adjusted_offsetStrain, y: data.offsetStress, mode: 'lines',
                line: { dash: 'dash', color: 'red', width: 1.5 }, name: 'Offset 0.2%'
            });
        }

        var layout = {
            title: { text: `Curva Ensayo ${this.testId}`, font: { family: 'system-ui, sans-serif', size: 16 } },
            xaxis: { title: 'Deformación Unitaria (mm/mm)', zeroline: true },
            yaxis: { title: 'Esfuerzo (MPa)', zeroline: true },
            hovermode: 'closest', margin: { l: 60, r: 30, t: 50, b: 50 },
            autosize: true, annotations: []
        };

        if (showOffset && data.x_Sy !== undefined && data.y_Sy !== undefined) {
            let final_x_Sy = applySmoothing ? data.x_Sy : data.x_Sy + epsilon_0;
            layout.annotations.push({ 
                x: final_x_Sy, y: data.y_Sy, xref: 'x', yref: 'y', 
                text: `Sy: ${Number(data.y_Sy).toFixed(2)} MPa`, 
                showarrow: true, arrowhead: 2, ax: -40, ay: -30, font: { color: 'red' } 
            });
        }

        // ¡Atención aquí! Pasamos el DIV HTML directamente (this.graphDiv), no un ID
        Plotly.newPlot(this.graphDiv, tracesToPlot, layout, {responsive: true});
    }
}

// ==========================================
// CONTROLADOR GLOBAL (El "Main")
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
const btnAddTest = document.getElementById('btnAddTest');
    const testsContainer = document.getElementById('testsContainer');
    const template = document.getElementById('testSectionTemplate');

    // --- NUEVO CÓDIGO DEL BOTÓN DE REPORTE GLOBAL ---
    const btnPrintGlobal = document.getElementById('btnPrintGlobalReport');
    if (btnPrintGlobal) {
        btnPrintGlobal.addEventListener('click', () => window.print());
    }

    function crearNuevoEnsayo() {
        // Clonamos el contenido del template (El molde HTML)
        const clon = template.content.cloneNode(true);
        // Buscamos el contenedor raíz de ese clon
        const testSection = clon.querySelector('.test-section');
        
        // Lo agregamos a la pantalla
        testsContainer.appendChild(clon);
        
        // Iniciamos el motor de JavaScript para ESE bloque específico
        new EnsayoTraccion(testSection);
    }

    // 1. Crear el primer ensayo por defecto al cargar la página
    crearNuevoEnsayo();

    // 2. Escuchar el botón para crear ensayos adicionales infinitos
    if (btnAddTest) {
        btnAddTest.addEventListener('click', crearNuevoEnsayo);
    }
});