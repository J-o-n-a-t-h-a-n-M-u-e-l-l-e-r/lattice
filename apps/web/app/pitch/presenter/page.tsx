import type { Metadata } from 'next';
import { PitchPresenter } from '../../../components/PitchPresenter';

export const metadata: Metadata = {
  title: 'Lattice | Presenter view',
  description: 'Presenter controls for the Lattice pitch deck.',
};

export default function PitchPresenterPage() {
  return <PitchPresenter />;
}
