import VisitorCategoryView from '@/components/visitors/VisitorCategoryView';

export default function SpecialGuestsPage() {
  return (
    <VisitorCategoryView
      category="SPECIAL_GUEST"
      title="Invited Guests"
      description="Registry of employee-invited guests and corporate visitors"
      icon="Award"
    />
  );
}
