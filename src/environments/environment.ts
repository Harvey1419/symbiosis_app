export const environment = {
  production: true,
  // Asumimos que el frontend prod es servido detras del mismo origen que la API
  // (reverse proxy o mismo host). Si el deploy expone la API en otro origen,
  // sobreescribir aqui durante el release.
  apiUrl: '/api',
};
