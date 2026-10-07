import VisitorCategoryView from '@/components/visitors/VisitorCategoryView';

export default function VisitorsPage() {
  return (
    <VisitorCategoryView
      category="ALL"
      title="All Registered Visitors"
      description="Complete registry of all guest and visitor entries across all gates"
      icon="Users"
    />
  );
}
