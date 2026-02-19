// Tipos para a tabela accounts - Credenciais de jogos vinculadas aos itens

export interface GameAccount {
  id: string;
  item_id: string;
  email: string;
  password: string;
  token?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGameAccountData {
  item_id: string;
  email: string;
  password: string;
  token?: string;
}

export interface UpdateGameAccountData {
  email?: string;
  password?: string;
  token?: string;
}
