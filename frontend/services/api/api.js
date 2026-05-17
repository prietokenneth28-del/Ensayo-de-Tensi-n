// services/api.js
export async function enviarDatos(payload) {
    const response = await fetch('http://localhost:5000/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error en el servidor');
    return await response.json();
}