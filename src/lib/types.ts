
export interface Position {
  id: string;
  name: string;
  order_index: number;
  created_at?: string;
}

export interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  photo_url: string;
  created_at?: string;
}

export interface Class {
  id: string;
  name: string;
  population: number;
  created_at?: string;
  votes_cast?: number;
}

export interface VoteSelection {
  position_id: string;
  candidate_id: string;
}

export interface ElectionConfig {
  id: string;
  is_voting_open: boolean;
  is_results_public: boolean;
}
