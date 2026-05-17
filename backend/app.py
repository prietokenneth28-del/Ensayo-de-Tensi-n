from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app) # Permite que el frontend se comunique con el backend

def procesar_ensayo(load, stroke, A, L0, units):
    # Conversión a arrays de Numpy
    load = np.array(load)
    stroke = np.array(stroke)
    
    # 1. Cálculos de Esfuerzo y Deformación
    # Suponiendo que load viene en toneladas (como en tu script original)
    g = 9.81 if units == 'si' else 32.174
    factor_fuerza = g * 1000 
    
    force = load * factor_fuerza
    stress = force / A
    strain = stroke / L0

    # 2. Compensación de Punta (Toe Compensation)
    idx_inicio, idx_fin = 50, 80 # Rangos ajustables
    m, b_lin = np.polyfit(strain[idx_inicio:idx_fin], stress[idx_inicio:idx_fin], 1)
    epsilon_0 = -b_lin / m
    strain_corrected = strain - epsilon_0

    # 3. Hallar Sy (Fluencia 0.2%)
    y_offset_line = m * (strain_corrected - 0.002)
    diferencia = stress - y_offset_line
    
    # Buscamos la intersección después de la zona elástica
    idx_fluencia = np.where(diferencia[idx_fin:] < 0)[0]
    if len(idx_fluencia) > 0:
        idx_real = idx_fluencia[0] + idx_fin
    else:
        idx_real = np.argmin(np.abs(diferencia[idx_fin:])) + idx_fin
        
    Sy = stress[idx_real]
    x_Sy = strain_corrected[idx_real]

    return {
        "E": round(m / 1000, 2), # GPa
        "Sy": round(Sy, 2),
        "Sut": round(np.max(stress), 2),
        "strain_corrected": strain_corrected.tolist(),
        "stress": stress.tolist(),
        "x_Sy": x_Sy,
        "y_Sy": Sy
    }


@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    try:
        results = procesar_ensayo(
            data['load'], 
            data['stroke'], 
            float(data['area']), 
            float(data['length']),
            data['units']
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)