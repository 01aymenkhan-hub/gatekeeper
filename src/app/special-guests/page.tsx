import VisitorCategoryView from '@/components/visitors/VisitorCategoryView';

export default function SpecialGuestsPage() {
  return (
    <VisitorCategoryView
      category="SPECIAL_GUEST"
      title="Special Guests & VIPs"
      description="Registry of dignitaries, executive visitors, and corporate delegations"
      icon="Award"
    />
  );
}
