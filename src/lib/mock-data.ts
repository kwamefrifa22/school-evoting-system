
import { Position, Candidate, Class } from './types';

export const MOCK_POSITIONS: Position[] = [
  { id: 'pos-1', name: 'School Prefect', order_index: 0 },
  { id: 'pos-2', name: 'Sports Prefect', order_index: 1 },
  { id: 'pos-3', name: 'Library Prefect', order_index: 2 },
];

export const MOCK_CANDIDATES: Candidate[] = [
  { id: 'cand-1', position_id: 'pos-1', full_name: 'John Doe', photo_url: 'https://picsum.photos/seed/jdoe/400/400' },
  { id: 'cand-2', position_id: 'pos-1', full_name: 'Jane Smith', photo_url: 'https://picsum.photos/seed/jsmith/400/400' },
  { id: 'cand-3', position_id: 'pos-2', full_name: 'Mike Johnson', photo_url: 'https://picsum.photos/seed/mj/400/400' },
  { id: 'cand-4', position_id: 'pos-2', full_name: 'Sarah Williams', photo_url: 'https://picsum.photos/seed/sw/400/400' },
  { id: 'cand-5', position_id: 'pos-3', full_name: 'Alice Cooper', photo_url: 'https://picsum.photos/seed/ac/400/400' },
];

export const MOCK_CLASSES: Class[] = [
  { id: 'cls-1', name: 'Grade 6A', population: 30, votes_cast: 15 },
  { id: 'cls-2', name: 'Grade 6B', population: 28, votes_cast: 28 },
  { id: 'cls-3', name: 'Grade 7A', population: 25, votes_cast: 5 },
  { id: 'cls-4', name: 'Grade 7B', population: 32, votes_cast: 0 },
];
