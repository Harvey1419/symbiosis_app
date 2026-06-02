export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}