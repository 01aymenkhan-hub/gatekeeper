import VisitorCategoryView from '@/components/visitors/VisitorCategoryView';

export default function VendorsPage() {
  return (
    <VisitorCategoryView
      category="VENDOR"
      title="Vendors & Suppliers"
      description="Registry of external vendors, suppliers, and procurement personnel"
      icon="Briefcase"
    />
  );
}
