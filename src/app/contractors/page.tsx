import VisitorCategoryView from '@/components/visitors/VisitorCategoryView';

export default function ContractorsPage() {
  return (
    <VisitorCategoryView
      category="CONTRACTOR"
      title="Contractors & Labor"
      description="Registry of maintenance workers, construction teams, and temporary contractors"
      icon="HardHat"
    />
  );
}
