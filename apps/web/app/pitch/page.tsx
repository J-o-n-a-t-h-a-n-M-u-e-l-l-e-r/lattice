import type { Metadata } from 'next';
import { PitchDeck } from '../../components/PitchDeck';

export const metadata: Metadata = {
  title: 'Lattice | Pitch',
  description: 'The dependency graph hidden in your backlog.',
};

export default function PitchPage() {
  return <PitchDeck />;
}
