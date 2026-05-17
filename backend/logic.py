import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


###------------Funciones--------------------
def propietiesGraf(xlim_left=None, xlim_right=None):
    plt.xlabel("Strain (mm/mm)")
    plt.ylabel("Stress (MPa)")
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.xlim(left=xlim_left, right=xlim_right)
    plt.axvline(0, color='black', lw=1) 
    plt.axhline(0, color='black', lw=1) 

### I. Datos iniciales
A = 76.23       # mm2
lenght = 89.326 # mm
load = [0.075,0.08,0.08,0.085,0.085,0.09,0.095,0.1,0.105,0.11,0.11,0.115,0.125,0.13,0.135,0.14,0.15,0.155,0.16,0.165,0.175,0.185,0.19,0.2,0.21,0.22,0.23,0.24,0.25,0.26,0.27,0.28,0.29,0.3,0.31,0.32,0.335,0.345,0.355,0.37,0.38,0.395,0.41,0.425,0.44,0.46,0.48,0.5,0.52,0.545,0.565,0.585,0.61,0.63,0.65,0.67,0.695,0.72,0.74,0.765,0.79,0.81,0.84,0.88,0.915,0.955,0.995,1.035,1.08,1.115,1.155,1.19,1.23,1.265,1.3,1.335,1.375,1.405,1.445,1.48,1.52,1.555,1.59,1.62,1.655,1.68,1.71,1.73,1.75,1.765,1.775,1.785,1.79,1.795,1.8,1.805,1.805,1.81,1.815,1.815,1.815,1.82,1.82,1.825,1.825,1.83,1.83,1.83,1.835,1.835,1.835,1.84,1.84,1.84,1.845,1.845,1.85,1.85,1.85,1.855,1.855,1.855,1.86,1.86,1.865,1.865,1.865,1.87,1.87,1.875,1.875,1.88,1.88,1.88,1.885,1.885,1.885,1.885,1.89,1.89,1.895,1.895,1.895,1.9,1.9,1.9,1.9,1.905,1.905,1.905,1.905,1.91,1.91,1.91,1.915,1.915,1.92,1.92,1.92,1.92,1.92,1.925,1.925,1.93,1.93,1.93,1.93,1.93,1.935,1.935,1.935,1.935,1.94,1.94,1.94,1.94,1.94,1.945,1.945,1.945,1.945,1.945,1.95,1.95,1.95,1.95,1.955,1.955,1.955,1.955,1.955,1.955,1.955,1.96,1.96,1.96,1.96,1.96,1.96,1.96,1.96,1.965,1.965,1.965,1.965,1.965,1.965,1.965,1.965,1.965,1.965,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.975,1.97,1.975,1.975,1.975,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.97,1.965,1.965,1.965,1.96,1.96,1.96,1.955,1.955,1.95,1.95,1.945,1.94,1.94,1.935,1.93,1.925,1.925,1.92,1.915,1.91,1.905,1.905,1.895,1.89,1.89,1.885,1.88,1.875,1.865,1.86,1.855,1.85,1.845,1.84,1.835,1.83,1.825,1.815,1.81,1.805,1.795,1.79,1.785,1.775,1.77,1.765,1.755,1.75,1.745,1.735,1.73,1.72,1.715,1.705,1.7,1.69,1.68,1.675,1.665,1.66,1.65,1.64,1.635,1.625,1.615,1.605,1.595,1.585,1.575,1.565,1.555,1.545,1.53,1.52,1.51,1.495,1.485,1.47,1.455,1.435,1.37,0.86]
stroke = [0,0.032,0.066,0.098,0.132,0.166,0.198,0.232,0.266,0.298,0.332,0.366,0.398,0.432,0.466,0.498,0.532,0.566,0.598,0.632,0.664,0.698,0.732,0.766,0.798,0.832,0.866,0.898,0.932,0.964,0.998,1.032,1.066,1.098,1.132,1.162,1.196,1.232,1.266,1.298,1.33,1.364,1.396,1.43,1.464,1.498,1.53,1.564,1.596,1.63,1.664,1.698,1.732,1.764,1.798,1.832,1.864,1.898,1.93,1.962,1.996,2.03,2.062,2.096,2.13,2.164,2.196,2.226,2.26,2.296,2.33,2.364,2.396,2.428,2.462,2.496,2.53,2.562,2.596,2.628,2.662,2.696,2.73,2.762,2.796,2.83,2.864,2.898,2.93,2.964,2.998,3.03,3.062,3.098,3.132,3.166,3.198,3.232,3.264,3.298,3.33,3.364,3.398,3.432,3.466,3.498,3.532,3.566,3.598,3.63,3.664,3.698,3.73,3.764,3.798,3.832,3.866,3.9,3.932,3.964,3.998,4.03,4.064,4.098,4.132,4.164,4.198,4.232,4.264,4.298,4.33,4.364,4.398,4.434,4.466,4.498,4.532,4.564,4.598,4.63,4.664,4.698,4.732,4.764,4.798,4.832,4.866,4.898,4.932,4.964,4.998,5.032,5.066,5.098,5.132,5.164,5.198,5.23,5.264,5.298,5.332,5.366,5.4,5.434,5.466,5.496,5.53,5.564,5.598,5.632,5.666,5.698,5.732,5.766,5.798,5.832,5.864,5.898,5.93,5.964,5.998,6.032,6.066,6.098,6.132,6.164,6.198,6.232,6.264,6.298,6.332,6.364,6.398,6.43,6.464,6.498,6.532,6.566,6.6,6.632,6.666,6.698,6.73,6.764,6.798,6.83,6.864,6.9,6.932,6.966,7,7.032,7.066,7.098,7.132,7.166,7.198,7.232,7.264,7.298,7.33,7.364,7.398,7.432,7.466,7.498,7.532,7.564,7.598,7.632,7.664,7.698,7.73,7.762,7.796,7.832,7.864,7.898,7.93,7.964,8,8.034,8.066,8.098,8.132,8.166,8.2,8.232,8.266,8.3,8.332,8.366,8.398,8.432,8.466,8.498,8.532,8.566,8.6,8.634,8.666,8.7,8.734,8.768,8.8,8.832,8.866,8.9,8.932,8.966,9,9.034,9.066,9.1,9.134,9.168,9.202,9.234,9.268,9.302,9.334,9.366,9.398,9.432,9.466,9.5,9.534,9.568,9.602,9.634,9.666,9.7,9.734,9.768,9.8,9.834,9.866,9.9,9.934,9.968,10.002,10.036,10.068,10.1,10.134,10.166,10.2,10.234,10.266,10.3,10.334,10.368,10.402,10.434,10.468,10.5,10.534,10.568,10.602,10.634,10.666,10.7,10.734,10.77,10.802,10.836,10.868,10.902,10.934,10.968,11,11.034,11.068,11.1,11.134,11.17,11.204,11.26,11.322,11.33]

U = ['Metrico', 'Ingles'] #Para seleccionar el sistema de unidades:
Units = U[0]

###  II. Cálculos de Esfuerzo y Deformación
if Units == 'Metrico':
  force = np.array(load) * 9.81 * 1000
  sigmaU = 'MPa'
  Eu = 'GPa'
else:
  force = np.array(load) * 32.174 * 1000 
  sigmaU = '-'
  Eu = '-'


stress = force / A
strain = np.array(stroke) / lenght

### --- III. COMPENSACIÓN DE PUNTA ---
idx_inicio, idx_fin = 50, 80
strain_lin = strain[idx_inicio:idx_fin]
stress_lin = stress[idx_inicio:idx_fin]

m, b_lin = np.polyfit(strain_lin, stress_lin, 1)
epsilon_0 = -b_lin / m
strain_corrected = strain - epsilon_0




### --- IV. Mechanical properties ---
# 1. Offset de 0.2% (0.002)
b_offset = (-m * 0.002)
x_offset_full = np.linspace(0.002, strain_corrected[idx_fin], 1000)
y_offset_full = m * x_offset_full + b_offset

# 2. Intersección (Búsqueda simplificada de Sy)
Sy = 0
x_Sy = 0
# 1. Definimos la recta de offset para todos los puntos de deformación corregida
# La ecuación es: y = m * (strain_corrected - 0.002)
y_offset_line = m * (strain_corrected - 0.002)

# 2. Calculamos la diferencia entre el esfuerzo real y la recta de offset
# Queremos el punto donde stress - y_offset_line = 0
diferencia = stress - y_offset_line

# 3. Buscamos el primer índice después del inicio de la zona lineal donde 
# el esfuerzo cae por debajo de la recta de offset (intersección)
# Filtramos para buscar solo después de la zona elástica (idx_fin)
idx_fluencia = np.where(diferencia[idx_fin:] < 0)[0]

if len(idx_fluencia) > 0:
    # El índice real es el encontrado + el desplazamiento del filtro
    idx_real = idx_fluencia[0] + idx_fin
    Sy = stress[idx_real]
    x_Sy = strain_corrected[idx_real]
else:
    # Si por alguna razón no cruza, tomamos el punto con la diferencia mínima
    idx_real = np.argmin(np.abs(diferencia[idx_fin:])) + idx_fin
    Sy = stress[idx_real]
    x_Sy = strain_corrected[idx_real]


# Recortamos la línea de offset para que no suba más allá de Sy
x_plot_offset = np.linspace(0.002, x_Sy, 100)
y_plot_offset = m * x_plot_offset + b_offset


# -------------Encontramos la recta del rango elastico para determinar correctamente la primera seccion de la grafica:---------
# Diferencia entre curva real y recta elástica
diff_elastic = stress - m * strain_corrected

# Buscamos el primer cruce DESPUÉS de la zona lineal (idx_fin)
# donde la curva real supera a la recta elástica y luego la vuelve a igualar
# → primer punto donde la diferencia empieza a crecer significativamente
idx_cruce_candidates = np.where(diff_elastic[0:] > 0)[0]

if len(idx_cruce_candidates) > 0:
    idx_cruce = idx_cruce_candidates[0] 
else:
    idx_cruce = idx_fin  # fallback

x_cruce = strain_corrected[idx_cruce]
y_cruce = stress[idx_cruce]

x_plot_elastic = np.linspace(0, x_cruce, 100)
y_plot_elastic = m * x_plot_elastic

strain_elastic = strain_corrected[idx_cruce:]
stress_elastic = stress[idx_cruce:]

# 3. Diccionario de Propiedades

MechanicalProperties = {
    'Sy': [round(Sy, 2), sigmaU],
    'E': [round(m/1000, 2), Eu],
    'Sut': [round(max(stress), 2), sigmaU],
    'Sigma_u': [round(stress[-1], 2), sigmaU]
}
tableMechanicalProperties = pd.DataFrame(MechanicalProperties)
# print(tableMechanicalProperties)



### V. --- GRAFICACIÓN ---
max_x = np.max(strain_corrected) + 0.01
 
# 1. Compensación de punta

## Pruebas (Borrar cuando se termine de de:)
plt.figure(1, figsize=(8, 5))
propietiesGraf(xlim_left=0, xlim_right=max_x)
plt.plot(strain_elastic, stress_elastic, 'r', label="Original")
plt.plot(x_plot_elastic, y_plot_elastic, 'r', label="Rango elastico")

# plt.figure(1, figsize=(8, 5))
# propietiesGraf(xlim_left=0, xlim_right=max_x)
# # plt.plot(strain, stress, 'k--', alpha=0.3, label="Original")
# plt.plot(strain_corrected, stress, "r", label="Compensada")
# plt.plot(x_plot_elastic, y_plot_elastic, "g", label="Rango elastico")
# plt.title("Tensile Test (Toe Compensation)")
# plt.legend()

# # 2. Esfuerzo de fluencia y Módulo
# plt.figure(2, figsize=(8, 5))
# propietiesGraf(xlim_left=0, xlim_right=max_x) # Zoom en zona elástica
# plt.plot(strain_corrected, stress, "r", label=r"$\sigma$ vs $\epsilon$ (Corregida)")
# plt.plot(x_plot_offset, y_plot_offset, 'b--', label="Offset 0.002")
# plt.scatter(x_Sy, Sy, color='blue', zorder=5)
# plt.title("Yield Strength & Elastic Modulus")
# plt.legend()
# # Anotación del módulo de elasticidad
# plt.text(0.005, Sy, f'E = {m/1000:.2f} GPa', fontsize=10, bbox=dict(facecolor='white', alpha=0.5))
# plt.text(0.005, Sy*1.1, f'Sy = {Sy:.2f} MPa', fontsize=10, bbox=dict(facecolor='white', alpha=0.5))



plt.tight_layout()
plt.show()