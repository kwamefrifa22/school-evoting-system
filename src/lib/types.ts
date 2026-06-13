
export interface Position {
  id: string;
  name: string;
  order_index: number;
}

export interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  photo_url: string;
  votes?: number;
}

export interface Class {
  id: string;
  name: string;
  population: number;
  votes_cast?: number;
}

export interface VoterToken {
  id: string;
  class_id: string;
  status: 'unused' | 'used';
  used_at?: any;
}

export interface SystemConfig {
  id: 'election_status';
  is_open: boolean;
}
