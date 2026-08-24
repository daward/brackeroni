import { useInfiniteScroll } from "@/components/shared";

type CompletedLoadMoreProps = {
  loading: boolean;
  onLoadMore: () => void;
  pageKey: number;
};

export function CompletedLoadMore({ loading, onLoadMore, pageKey }: CompletedLoadMoreProps) {
  const sentinelRef = useInfiniteScroll({
    enabled: true,
    loading,
    pageKey,
    onLoadMore,
  });

  return (
    <div ref={sentinelRef} className="vote-completed-load-more">
      <span className="sr-only">Loading more completed brackets</span>
    </div>
  );
}
